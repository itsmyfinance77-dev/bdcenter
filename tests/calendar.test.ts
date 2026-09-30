import { describe, expect, it } from 'vitest';
import { buildCalendar, escapeText, foldLine, icalDate } from '@/lib/ical';
import {
  addJalaliMonths,
  jalaliDayStart,
  jalaliMonthLength,
  jalaliParts,
  parseJalaliMonth,
  persianWeekday,
} from '@/lib/jalali';

describe('Jalali months', () => {
  it('knows month lengths, including leap Esfand', () => {
    expect(jalaliMonthLength({ year: 1405, month: 1 })).toBe(31);
    expect(jalaliMonthLength({ year: 1405, month: 7 })).toBe(30);
    expect(jalaliMonthLength({ year: 1403, month: 12 })).toBe(30); // leap year
    expect(jalaliMonthLength({ year: 1404, month: 12 })).toBe(29);
  });

  it('starts days at Tehran midnight and places them on the Persian week', () => {
    const mehr1 = jalaliDayStart(1405, 7, 1)!;
    expect(mehr1.toISOString()).toBe('2026-09-22T20:30:00.000Z');
    expect(persianWeekday(mehr1)).toBe(4); // Wednesday
    expect(jalaliParts(mehr1)).toEqual({ year: 1405, month: 7, day: 1 });
    // 23:59 Tehran is still the same Persian day.
    expect(jalaliParts(new Date('2026-09-23T20:29:00Z')).day).toBe(1);
  });

  it('moves between months and years and parses the month parameter', () => {
    expect(addJalaliMonths({ year: 1405, month: 12 }, 1)).toEqual({ year: 1406, month: 1 });
    expect(addJalaliMonths({ year: 1405, month: 1 }, -1)).toEqual({ year: 1404, month: 12 });
    expect(parseJalaliMonth('۱۴۰۵-۰۷')).toEqual({ year: 1405, month: 7 });
    for (const bad of ['1405-13', '1405-0', 'x', undefined, '99999-01']) {
      expect(parseJalaliMonth(bad)).toBeNull();
    }
  });
});

describe('iCalendar', () => {
  it('writes UTC times and escapes text', () => {
    expect(icalDate(new Date('2026-10-01T12:30:00.123Z'))).toBe('20261001T123000Z');
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });

  it('folds long lines at 75 bytes without splitting Persian letters', () => {
    const folded = foldLine(`SUMMARY:${'آموزش '.repeat(30)}`);
    const lines = folded.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(lines.slice(1).every((line) => line.startsWith(' '))).toBe(true);
    expect(lines.map((line, i) => (i === 0 ? line : line.slice(1))).join('')).toBe(
      `SUMMARY:${'آموزش '.repeat(30)}`,
    );
  });

  it('builds a calendar with CRLF lines and a default one-hour length', () => {
    const body = buildCalendar(
      [
        {
          uid: 'event-1@bdcenter.yazdccima.com',
          title: 'نشست, تخصصی',
          startsAt: new Date('2026-10-01T10:00:00Z'),
          location: 'یزد',
          url: 'https://bdcenter.yazdccima.com/events/x',
        },
      ],
      { name: 'تقویم', now: new Date('2026-09-30T00:00:00Z') },
    );
    expect(body.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(body.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(body).toContain('DTSTART:20261001T100000Z\r\nDTEND:20261001T110000Z');
    expect(body).toContain('SUMMARY:نشست\\, تخصصی');
    expect(body).toContain('DTSTAMP:20260930T000000Z');
    expect(body).not.toMatch(/[^\r]\n/);
  });
});
