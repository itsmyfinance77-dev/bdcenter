import { createHmac, timingSafeEqual } from 'node:crypto';
import { calendarCopy, siteInfo } from '@/content/site';
import { buildCalendar, type CalendarEvent } from '@/lib/ical';
import {
  addJalaliMonths,
  jalaliDayStart,
  jalaliMonthLength,
  jalaliParts,
  persianWeekday,
  type JalaliMonth,
} from '@/lib/jalali';
import { formatNumber } from '@/lib/format';
import { plainExcerpt } from '@/lib/text';
import { listMemberBookings } from '@/modules/appointments/service';
import { getPublishedArticle, listPublishedEventsBetween } from '@/modules/content/service';
import { getMemberCalendarVersion } from '@/modules/members/service';
import {
  getPublishedCourse,
  listMemberEnrollments,
  listPublishedCourseSessionsBetween,
} from '@/modules/training/service';

/**
 * The events calendar: published events (news/events domain) and courses
 * (training domain) placed on a Solar Hijri month grid, plus iCalendar
 * exports so visitors can add them to their phone's calendar.
 */

export type CalendarItem = {
  key: string;
  kind: 'event' | 'course';
  title: string;
  href: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  description: string | null;
  updatedAt: Date;
};

function siteUrl(path: string): string {
  return new URL(path, process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3010').toString();
}

/** Every iCalendar UID uses the site's own domain (src/content/site.ts), so a
 * future domain change only needs to happen in one place. */
const uidDomain = siteInfo.domain;

/**
 * A course session as a calendar item. The key (and so the iCalendar UID) is
 * the course and the session's start, which stays the same when the course is
 * saved again; a moved session becomes a new entry.
 */
function sessionItem(
  course: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    location: string | null;
    updatedAt: Date;
  },
  session: { startsAt: Date; endsAt: Date | null; location: string | null; topic: string | null },
  numbering: { number: number; total: number },
): CalendarItem {
  const label =
    numbering.total > 1
      ? `${course.title} — جلسهٔ ${formatNumber(numbering.number)} از ${formatNumber(numbering.total)}`
      : course.title;
  const about = course.description ? plainExcerpt(course.description) : null;
  return {
    key: `course-${course.id}-${session.startsAt.getTime()}`,
    kind: 'course',
    title: label,
    href: `/courses/${encodeURIComponent(course.slug)}`,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    location: session.location ?? course.location,
    description: [session.topic, about].filter(Boolean).join(' — ') || null,
    updatedAt: course.updatedAt,
  };
}

async function itemsBetween(from: Date, to: Date): Promise<CalendarItem[]> {
  const [events, courses] = await Promise.all([
    listPublishedEventsBetween(from, to),
    listPublishedCourseSessionsBetween(from, to),
  ]);
  const items: CalendarItem[] = [
    ...events.map((event) => ({
      key: `event-${event.id}`,
      kind: 'event' as const,
      title: event.title,
      href: `/events/${encodeURIComponent(event.slug)}`,
      startsAt: event.eventStartsAt!,
      endsAt: event.eventEndsAt,
      location: event.eventLocation,
      description: event.excerpt,
      updatedAt: event.updatedAt,
    })),
    ...courses.map((session) => sessionItem(session.course, session, session)),
  ];
  return items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export type MonthGrid = {
  month: JalaliMonth;
  previous: JalaliMonth;
  next: JalaliMonth;
  /** Empty cells before day 1, so day 1 sits under its weekday (Saturday first). */
  leadingBlanks: number;
  days: { day: number; isToday: boolean; items: CalendarItem[] }[];
  items: CalendarItem[];
};

/** One month of the calendar, in Tehran time. */
export async function getMonthGrid(month: JalaliMonth, now = new Date()): Promise<MonthGrid> {
  const length = jalaliMonthLength(month);
  const start = jalaliDayStart(month.year, month.month, 1)!;
  const next = addJalaliMonths(month, 1);
  const end = jalaliDayStart(next.year, next.month, 1)!;
  const items = await itemsBetween(start, end);
  const today = jalaliParts(now);

  const days = Array.from({ length }, (_, index) => ({
    day: index + 1,
    isToday: today.year === month.year && today.month === month.month && today.day === index + 1,
    items: [] as CalendarItem[],
  }));
  for (const item of items) days[jalaliParts(item.startsAt).day - 1]?.items.push(item);

  return {
    month,
    previous: addJalaliMonths(month, -1),
    next,
    leadingBlanks: persianWeekday(start),
    days,
    items,
  };
}

export function currentJalaliMonth(now = new Date()): JalaliMonth {
  const { year, month } = jalaliParts(now);
  return { year, month };
}

function toCalendarEvent(item: CalendarItem): CalendarEvent {
  return {
    uid: `${item.key}@${uidDomain}`,
    title: item.title,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    location: item.location,
    description: item.description,
    url: siteUrl(item.href),
    updatedAt: item.updatedAt,
  };
}

/** Subscribable feed: the last 30 days and everything ahead, at most 500 of each kind. */
export async function calendarFeed(now = new Date()): Promise<string> {
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const items = await itemsBetween(from, new Date(now.getTime() + 5 * 365 * 24 * 60 * 60 * 1000));
  return buildCalendar(items.map(toCalendarEvent), { name: calendarCopy.feedName, now });
}

/** A single event's .ics, or null when it is unpublished or has no start time. */
export async function eventIcs(slug: string): Promise<{ id: string; body: string } | null> {
  const event = await getPublishedArticle('EVENT', slug);
  if (!event?.eventStartsAt) return null;
  const item: CalendarItem = {
    key: `event-${event.id}`,
    kind: 'event',
    title: event.title,
    href: `/events/${encodeURIComponent(event.slug)}`,
    startsAt: event.eventStartsAt,
    endsAt: event.eventEndsAt,
    location: event.eventLocation,
    description: event.excerpt,
    updatedAt: event.updatedAt,
  };
  return { id: event.id, body: buildCalendar([toCalendarEvent(item)], { name: event.title }) };
}

/** A course's .ics with every session, or null when it is unpublished or has none. */
export async function courseIcs(slug: string): Promise<{ id: string; body: string } | null> {
  const course = await getPublishedCourse(slug);
  if (!course || course.sessions.length === 0) return null;
  const total = course.sessions.length;
  const events = course.sessions.map((session, index) =>
    toCalendarEvent(sessionItem(course, session, { number: index + 1, total })),
  );
  return { id: course.id, body: buildCalendar(events, { name: course.title }) };
}

// ---------------------------------------------------------------------------
// A member's personal calendar: their live bookings and the courses they are
// enrolled in, at a secret address calendar apps can subscribe to (they send
// no cookies). The address carries an HMAC of the member id and a version, so
// nothing secret is stored and "new address" just bumps the version.
// ---------------------------------------------------------------------------

function feedSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be set.');
  return secret;
}

function memberFeedToken(memberId: string, version: number): string {
  return createHmac('sha256', feedSecret())
    .update(`member-calendar:${memberId}:${version}`)
    .digest('base64url')
    .slice(0, 32);
}

/** Path of the member's personal feed. */
export async function memberFeedPath(memberId: string): Promise<string | null> {
  const version = await getMemberCalendarVersion(memberId);
  if (version === null) return null;
  return `/calendar/member/${memberId}/${memberFeedToken(memberId, version)}.ics`;
}

const ENROLLED_STATUSES = ['NEW', 'IN_REVIEW', 'ACCEPTED', 'DONE'];

/** The personal feed, or null when the address is wrong, revoked or the member inactive. */
export async function memberCalendarFeed(
  memberId: string,
  token: string,
  now = new Date(),
): Promise<string | null> {
  const version = await getMemberCalendarVersion(memberId);
  if (version === null) return null;
  const expected = Buffer.from(memberFeedToken(memberId, version));
  const given = Buffer.from(token);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [bookings, enrollments] = await Promise.all([
    listMemberBookings(memberId),
    listMemberEnrollments(memberId),
  ]);
  const events: CalendarEvent[] = [
    ...bookings
      .filter((booking) => booking.status === 'BOOKED' && booking.slot.startsAt > since)
      .map((booking) => ({
        uid: `booking-${booking.id}@${uidDomain}`,
        title: `${calendarCopy.bookingPrefix} ${booking.slot.staff.fullName} — ${booking.topic}`,
        startsAt: booking.slot.startsAt,
        endsAt: booking.slot.endsAt,
        location: booking.slot.location,
        url: siteUrl('/account'),
      })),
    ...enrollments
      .filter((enrollment) => ENROLLED_STATUSES.includes(enrollment.status))
      .flatMap((enrollment) => {
        const { course } = enrollment;
        const total = course.sessions.length;
        return course.sessions
          .map((session, index) => ({ session, number: index + 1 }))
          .filter(({ session }) => session.startsAt > since)
          .map(({ session, number }) => ({
            uid: `enrollment-${enrollment.id}-${session.startsAt.getTime()}@${uidDomain}`,
            title:
              total > 1
                ? `${calendarCopy.coursePrefix} ${course.title} — جلسهٔ ${formatNumber(number)} از ${formatNumber(total)}`
                : `${calendarCopy.coursePrefix} ${course.title}`,
            startsAt: session.startsAt,
            endsAt: session.endsAt,
            location: session.location ?? course.location,
            url: siteUrl(`/courses/${encodeURIComponent(course.slug)}`),
          }));
      }),
  ];
  return buildCalendar(events, { name: calendarCopy.personalFeedName, now });
}
