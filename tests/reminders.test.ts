import { describe, expect, it } from 'vitest';
import { checkCronAuth } from '@/lib/cron-auth';
import {
  inQuietHours,
  MIN_LEAD_MS,
  reminderDueAt,
  reminderWindow,
  tehranHour,
} from '@/modules/reminders/schedule';
import { reminderInputSchema } from '@/modules/settings/service';

/** Tehran is UTC+03:30 all year. */
const tehran = (hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 9, 5, hour, minute) - 3.5 * 60 * 60 * 1000);

describe('reminder timing', () => {
  it('reads the hour in Tehran', () => {
    expect(tehranHour(tehran(0, 10))).toBe(0);
    expect(tehranHour(tehran(23, 59))).toBe(23);
  });

  it('keeps quiet across midnight and within a day', () => {
    expect(inQuietHours(tehran(22), 22, 8)).toBe(true);
    expect(inQuietHours(tehran(3), 22, 8)).toBe(true);
    expect(inQuietHours(tehran(7, 59), 22, 8)).toBe(true);
    expect(inQuietHours(tehran(8), 22, 8)).toBe(false);
    expect(inQuietHours(tehran(21, 59), 22, 8)).toBe(false);
    expect(inQuietHours(tehran(13), 12, 14)).toBe(true);
    expect(inQuietHours(tehran(14), 12, 14)).toBe(false);
    expect(inQuietHours(tehran(3), 5, 5)).toBe(false);
  });

  it('reminds from half an hour up to the chosen hours ahead', () => {
    const now = new Date('2026-10-05T06:00:00Z');
    const { from, to } = reminderWindow(now, 24);
    expect(from.getTime() - now.getTime()).toBe(MIN_LEAD_MS);
    expect(to.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(reminderDueAt(new Date('2026-10-06T06:00:00Z'), 24)).toEqual(now);
  });
});

describe('scheduler authentication', () => {
  const secret = 'a'.repeat(40);

  it('accepts only the exact bearer secret', () => {
    expect(checkCronAuth(`Bearer ${secret}`, secret)).toBe('ok');
    expect(checkCronAuth(`Bearer ${secret}x`, secret)).toBe('unauthorized');
    expect(checkCronAuth(secret, secret)).toBe('unauthorized');
    expect(checkCronAuth(null, secret)).toBe('unauthorized');
    expect(checkCronAuth('Bearer ', secret)).toBe('unauthorized');
  });

  it('stays off without a long enough secret', () => {
    expect(checkCronAuth('Bearer short', 'short')).toBe('unconfigured');
    expect(checkCronAuth('Bearer x', '')).toBe('unconfigured');
  });
});

describe('reminder settings form', () => {
  it('reads checkboxes, Persian digits and quiet hours', () => {
    expect(
      reminderInputSchema.parse({
        bookingsEnabled: 'on',
        bookingsHours: '۲۴',
        coursesHours: '48',
        quietFrom: '22',
        quietUntil: '8',
      }),
    ).toEqual({
      bookings: { enabled: true, hoursBefore: 24 },
      courses: { enabled: false, hoursBefore: 48 },
      quietFrom: 22,
      quietUntil: 8,
    });
  });

  it('refuses hours out of range or missing', () => {
    const base = { bookingsHours: '24', coursesHours: '24', quietFrom: '22', quietUntil: '8' };
    expect(reminderInputSchema.safeParse({ ...base, bookingsHours: '0' }).success).toBe(false);
    expect(reminderInputSchema.safeParse({ ...base, coursesHours: '73' }).success).toBe(false);
    expect(reminderInputSchema.safeParse({ ...base, quietFrom: '24' }).success).toBe(false);
    expect(reminderInputSchema.safeParse({ ...base, bookingsHours: '' }).success).toBe(false);
    expect(reminderInputSchema.safeParse({ ...base, bookingsHours: '2.5' }).success).toBe(false);
  });
});
