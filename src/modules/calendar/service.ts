import { calendarCopy } from '@/content/site';
import { buildCalendar, type CalendarEvent } from '@/lib/ical';
import {
  addJalaliMonths,
  jalaliDayStart,
  jalaliMonthLength,
  jalaliParts,
  persianWeekday,
  type JalaliMonth,
} from '@/lib/jalali';
import { plainExcerpt } from '@/lib/text';
import { getPublishedArticle, listPublishedEventsBetween } from '@/modules/content/service';
import { getPublishedCourse, listPublishedCoursesBetween } from '@/modules/training/service';

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

const uidDomain = 'bdcenter.yazdccima.com';

async function itemsBetween(from: Date, to: Date): Promise<CalendarItem[]> {
  const [events, courses] = await Promise.all([
    listPublishedEventsBetween(from, to),
    listPublishedCoursesBetween(from, to),
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
    ...courses.map((course) => ({
      key: `course-${course.id}`,
      kind: 'course' as const,
      title: course.title,
      href: `/courses/${encodeURIComponent(course.slug)}`,
      startsAt: course.startsAt!,
      endsAt: course.endsAt,
      location: course.location,
      description: course.description ? plainExcerpt(course.description) : null,
      updatedAt: course.updatedAt,
    })),
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

/** A single course's .ics, or null when it is unpublished or has no start time. */
export async function courseIcs(slug: string): Promise<{ id: string; body: string } | null> {
  const course = await getPublishedCourse(slug);
  if (!course?.startsAt) return null;
  const item: CalendarItem = {
    key: `course-${course.id}`,
    kind: 'course',
    title: course.title,
    href: `/courses/${encodeURIComponent(course.slug)}`,
    startsAt: course.startsAt,
    endsAt: course.endsAt,
    location: course.location,
    description: course.description ? plainExcerpt(course.description) : null,
    updatedAt: course.updatedAt,
  };
  return { id: course.id, body: buildCalendar([toCalendarEvent(item)], { name: course.title }) };
}
