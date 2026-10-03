import { serviceLabel } from '@/content/appointments';
import { reminderNotice } from '@/content/reminders';
import { formatTime, formatWeekdayDate } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { listBookingsStartingBetween } from '@/modules/appointments/service';
import { recordJobRun } from '@/modules/jobs/service';
import { sendReminder } from '@/modules/notifications/service';
import { getSetting } from '@/modules/settings/service';
import { listAcceptedEnrollmentsStartingBetween } from '@/modules/training/service';
import { inQuietHours, reminderDueAt, reminderWindow, type QuietHours } from './schedule';

/**
 * Reminder SMS (owner's request, 2026-10-04): before a booked appointment and
 * before an accepted course starts, at the time an ADMIN sets in «تنظیمات
 * سایت». The scheduler calls `runReminders` every 15 minutes through
 * /api/cron/reminders; each run sends whatever is due and not yet sent.
 *
 * - Nothing is sent during the quiet hours. A reminder due in them goes out
 *   when they end, or the evening before if the start comes too soon after
 *   them (reminderDueAt).
 * - A booking made after its reminder time gets none: the booking SMS the
 *   member just received already carries the date and time.
 * - Each reminder is claimed in `reminders` (unique kind + target + start
 *   time) before it is sent, so overlapping runs never send it twice. A failed
 *   SMS is not retried (the provider may have delivered it anyway); neither is
 *   a claim whose run died before recording the result (`smsSent` stays null).
 * - Soonest starts go first when a run hits MAX_SENDS_PER_RUN.
 */

/** Upper bound of messages per run; the rest go out on the next run. */
export const MAX_SENDS_PER_RUN = 300;

export type ReminderRunResult = {
  quiet: boolean;
  sent: number;
  failed: number;
  /** Bookings made after their reminder time. */
  skipped: number;
};

type Candidate = {
  kind: 'BOOKING' | 'COURSE';
  targetId: string;
  startsAt: Date;
  send: () => Promise<boolean>;
};

function accountLink(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3010';
  return new URL('/account', base).toString();
}

const when = (date: Date) => `${formatWeekdayDate(date)}، ساعت ${formatTime(date)}`;

async function bookingCandidates(
  now: Date,
  hoursBefore: number,
  quiet: QuietHours,
  result: ReminderRunResult,
) {
  const { from, to } = reminderWindow(now, hoursBefore);
  const bookings = await listBookingsStartingBetween(from, to);
  const candidates: Candidate[] = [];
  for (const booking of bookings) {
    const { startsAt, location, staff } = booking.slot;
    const dueAt = reminderDueAt(startsAt, hoursBefore, quiet);
    if (dueAt > now) continue;
    if (booking.createdAt > dueAt) {
      result.skipped += 1;
      continue;
    }
    candidates.push({
      kind: 'BOOKING',
      targetId: booking.id,
      startsAt,
      send: () =>
        sendReminder({
          entity: 'Booking',
          entityId: booking.id,
          phone: booking.phone,
          email: booking.email,
          notice: reminderNotice.booking(
            serviceLabel[staff.service],
            staff.fullName,
            when(startsAt),
            location,
            accountLink(),
          ),
        }),
    });
  }
  return candidates;
}

async function courseCandidates(now: Date, hoursBefore: number, quiet: QuietHours) {
  const { from, to } = reminderWindow(now, hoursBefore);
  const enrollments = await listAcceptedEnrollmentsStartingBetween(from, to);
  return enrollments.flatMap((enrollment): Candidate[] => {
    const { title, startsAt, location } = enrollment.course;
    if (!startsAt || reminderDueAt(startsAt, hoursBefore, quiet) > now) return [];
    return [
      {
        kind: 'COURSE',
        targetId: enrollment.id,
        startsAt,
        send: () =>
          sendReminder({
            entity: 'Enrollment',
            entityId: enrollment.id,
            phone: enrollment.phone,
            email: enrollment.email,
            notice: reminderNotice.course(title, when(startsAt), location, accountLink()),
          }),
      },
    ];
  });
}

/** Drops candidates whose reminder for this start time already exists. */
async function notYetReminded(candidates: Candidate[]) {
  if (candidates.length === 0) return [];
  const done = await prisma.reminder.findMany({
    where: { targetId: { in: candidates.map((c) => c.targetId) } },
    select: { kind: true, targetId: true, occurrenceAt: true },
  });
  const key = (kind: string, id: string, at: Date) => `${kind}|${id}|${at.getTime()}`;
  const seen = new Set(done.map((row) => key(row.kind, row.targetId, row.occurrenceAt)));
  return candidates.filter((c) => !seen.has(key(c.kind, c.targetId, c.startsAt)));
}

/** Inserts the reminder row; false when another run got there first. */
async function claim(candidate: Candidate): Promise<boolean> {
  const { count } = await prisma.reminder.createMany({
    data: [
      { kind: candidate.kind, targetId: candidate.targetId, occurrenceAt: candidate.startsAt },
    ],
    skipDuplicates: true,
  });
  return count === 1;
}

export async function runReminders(now = new Date()): Promise<ReminderRunResult> {
  const settings = await getSetting('reminders');
  const result: ReminderRunResult = { quiet: false, sent: 0, failed: 0, skipped: 0 };

  const quiet = { from: settings.quietFrom, until: settings.quietUntil };
  if (inQuietHours(now, quiet.from, quiet.until)) {
    result.quiet = true;
  } else {
    const candidates = [
      ...(settings.bookings.enabled
        ? await bookingCandidates(now, settings.bookings.hoursBefore, quiet, result)
        : []),
      ...(settings.courses.enabled
        ? await courseCandidates(now, settings.courses.hoursBefore, quiet)
        : []),
    ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    for (const candidate of await notYetReminded(candidates)) {
      if (result.sent + result.failed >= MAX_SENDS_PER_RUN) break;
      if (!(await claim(candidate))) continue;
      // One broken send (provider or database error) must not stop the others.
      const smsSent = await candidate.send().catch((error: unknown) => {
        console.error(`[reminders] ${candidate.kind} ${candidate.targetId} failed`, error);
        return false;
      });
      await prisma.reminder.update({
        where: {
          kind_targetId_occurrenceAt: {
            kind: candidate.kind,
            targetId: candidate.targetId,
            occurrenceAt: candidate.startsAt,
          },
        },
        data: { smsSent },
      });
      if (smsSent) result.sent += 1;
      else result.failed += 1;
    }
  }

  await recordJobRun('reminders', result);
  return result;
}
