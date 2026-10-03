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

/** Starts that are due for a reminder now: no sooner than MIN_LEAD, no later than `hoursBefore`. */
export function reminderWindow(now: Date, hoursBefore: number) {
  return {
    from: new Date(now.getTime() + MIN_LEAD_MS),
    to: new Date(now.getTime() + hoursBefore * HOUR_MS),
  };
}

/** When the reminder for a start is due. */
export function reminderDueAt(startsAt: Date, hoursBefore: number): Date {
  return new Date(startsAt.getTime() - hoursBefore * HOUR_MS);
}
