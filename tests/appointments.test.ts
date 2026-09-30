import { describe, expect, it } from 'vitest';
import { jalaliDayStart, persianWeekday } from '@/lib/jalali';
import {
  MAX_SERIES_SLOTS,
  planSeries,
  planSingleSlot,
  slotInputSchema,
  slotSeriesSchema,
} from '@/modules/appointments/service';

const series = (overrides: Record<string, unknown> = {}) =>
  slotSeriesSchema.parse({
    fromDate: '1405/07/11', // Saturday
    toDate: '1405/07/17', // Friday
    weekdays: ['0', '2'], // Saturday, Monday
    startTime: '09:00',
    endTime: '11:00',
    durationMinutes: '30',
    location: 'دفتر مرکز',
    ...overrides,
  });

describe('slot planning', () => {
  it('expands a weekly pattern into Tehran-time slots on the chosen weekdays', () => {
    const plans = planSeries(series(), persianWeekday);
    if (!Array.isArray(plans)) throw new Error(String(plans));
    expect(plans).toHaveLength(8); // 2 days x 4 half-hour slots
    const saturday = jalaliDayStart(1405, 7, 11)!;
    expect(persianWeekday(saturday)).toBe(0);
    expect(plans[0]!.startsAt.getTime() - saturday.getTime()).toBe(9 * 3600_000);
    expect(plans[3]!.endsAt.getTime() - saturday.getTime()).toBe(11 * 3600_000);
    expect(plans.every((plan) => plan.location === 'دفتر مرکز')).toBe(true);
    expect(new Set(plans.map((plan) => persianWeekday(plan.startsAt)))).toEqual(new Set([0, 2]));
  });

  it('does not create a slot that would run past the end time', () => {
    const plans = planSeries(series({ durationMinutes: '45' }), persianWeekday);
    if (!Array.isArray(plans)) throw new Error(String(plans));
    expect(plans).toHaveLength(4); // 09:00, 09:45 on each day; 10:30 would end at 11:15
  });

  it('refuses reversed or over-long ranges and runaway series', () => {
    expect(
      planSeries(series({ fromDate: '1405/07/18', toDate: '1405/07/12' }), persianWeekday),
    ).toBe('bad-range');
    expect(planSeries(series({ toDate: '1406/08/01' }), persianWeekday)).toBe('bad-range');
    const huge = series({
      toDate: '1406/06/30',
      weekdays: ['0', '1', '2', '3', '4', '5', '6'],
      startTime: '00:00',
      endTime: '23:00',
      durationMinutes: '5',
    });
    expect(planSeries(huge, persianWeekday)).toBe('too-many');
    expect(MAX_SERIES_SLOTS).toBeGreaterThan(0);
  });

  it('validates inputs, accepting Persian digits', () => {
    expect(slotSeriesSchema.safeParse({ ...series(), endTime: '08:00' }).success).toBe(false);
    expect(slotSeriesSchema.safeParse({ ...series(), weekdays: [] }).success).toBe(false);
    const single = slotInputSchema.parse({
      date: '۱۴۰۵/۰۷/۱۵',
      startTime: '۱۶:۳۰',
      durationMinutes: '۴۵',
    });
    const plan = planSingleSlot(single);
    expect(plan.startsAt.toISOString()).toBe('2026-10-07T13:00:00.000Z');
    expect(plan.endsAt.getTime() - plan.startsAt.getTime()).toBe(45 * 60_000);
    expect(slotInputSchema.safeParse({ date: '1405/13/01', startTime: '10:00' }).success).toBe(
      false,
    );
    expect(slotInputSchema.safeParse({ date: '1405/07/15', startTime: '25:00' }).success).toBe(
      false,
    );
  });
});
