/**
 * Timing rules of the reminder SMS, kept free of database code so they can be
 * unit-tested. All clock times are Tehran time (the site's only time zone).
 */

/** A reminder is not worth sending when the start is less than this far away. */
export const MIN_LEAD_MS = 30 * 60 * 1000;

const HOUR_MS = 60 * 60 * 1000;

const hourFormat = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  hourCycle: 'h23',
  timeZone: 'Asia/Tehran',
});

/** Hour of the day (0–23) in Tehran. */
export function tehranHour(date: Date): number {
  return Number(hourFormat.format(date));
}

/**
 * True between `from` (inclusive) and `until` (exclusive), Tehran hours; the
 * range may cross midnight (22 → 8). Equal hours mean no quiet time at all.
 */
export function inQuietHours(date: Date, from: number, until: number): boolean {
  if (from === until) return false;
  const hour = tehranHour(date);
  return from < until ? hour >= from && hour < until : hour >= from || hour < until;
}

/** Tehran is UTC+03:30 all year (no daylight saving since 2022). */
const TEHRAN_OFFSET_MS = 3.5 * HOUR_MS;
const DAY_MS = 24 * HOUR_MS;

export type QuietHours = { from: number; until: number };

/**
 * Starts worth looking at now. A reminder can fall due up to a day earlier
 * than `hoursBefore` (see reminderDueAt), so the window reaches that far;
 * which of them are due is decided by reminderDueAt.
 */
export function reminderWindow(now: Date, hoursBefore: number) {
  return {
    from: new Date(now.getTime() + MIN_LEAD_MS),
    to: new Date(now.getTime() + hoursBefore * HOUR_MS + DAY_MS),
  };
}

/** `hour`:00 in Tehran on the Tehran calendar day of `date`. */
function tehranClock(date: Date, hour: number): number {
  const local = new Date(date.getTime() + TEHRAN_OFFSET_MS);
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour);
  return day - TEHRAN_OFFSET_MS;
}

/**
 * When the reminder for a start is due: `hoursBefore` ahead. If that moment
 * falls in the quiet hours, it moves to the end of them (the morning), or —
 * when the start would then be less than MIN_LEAD away — to an hour before
 * they began (the evening before), so no reminder is lost to the quiet hours.
 */
export function reminderDueAt(startsAt: Date, hoursBefore: number, quiet: QuietHours): Date {
  const due = new Date(startsAt.getTime() - hoursBefore * HOUR_MS);
  if (!inQuietHours(due, quiet.from, quiet.until)) return due;

  let end = tehranClock(due, quiet.until);
  if (end <= due.getTime()) end += DAY_MS;
  if (startsAt.getTime() - end >= MIN_LEAD_MS) return new Date(end);

  let start = tehranClock(due, quiet.from);
  if (start > due.getTime()) start -= DAY_MS;
  return new Date(start - HOUR_MS);
}
