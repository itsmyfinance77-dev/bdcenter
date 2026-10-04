import { describe, expect, it } from 'vitest';
import { toPersianDigits } from '@/lib/format';
import {
  courseSpan,
  parseSessions,
  sessionFormValues,
  unexplainedEnd,
} from '@/modules/training/sessions';

/** `hh:mm` Tehran on a Jalali day of Aban 1405 (1 Aban = 23 October 2026). */
const aban = (day: number, hh: number, mm = 0) =>
  new Date(Date.UTC(2026, 9, 22 + day, hh, mm) - 3.5 * 60 * 60 * 1000);

describe('course sessions', () => {
  it('reads rows in any digit script, skips empty ones and sorts by start', () => {
    const { sessions, errors } = parseSessions({
      s0date: '۱۴۰۵/۰۸/۰۸',
      s0start: '۱۶:۰۰',
      s0end: '۱۸:۳۰',
      s0location: 'سالن ۲',
      s1date: '',
      s2date: '1405/08/01',
      s2start: '9:30',
      s2topic: 'آشنایی',
    });
    expect(errors).toEqual({});
    expect(sessions).toEqual([
      { startsAt: aban(1, 9, 30), endsAt: null, location: null, topic: 'آشنایی' },
      { startsAt: aban(8, 16), endsAt: aban(8, 18, 30), location: 'سالن ۲', topic: null },
    ]);
    expect(courseSpan(sessions)).toEqual({ startsAt: aban(1, 9, 30), endsAt: aban(8, 18, 30) });
    expect(courseSpan([])).toEqual({ startsAt: null, endsAt: null });
    // No end time on the last session: no course end, not a copy of its start.
    expect(courseSpan(sessions.slice(0, 1))).toEqual({ startsAt: aban(1, 9, 30), endsAt: null });
  });

  it('flags a stored course end its sessions do not explain', () => {
    const one = [{ startsAt: aban(1, 9), endsAt: aban(1, 12), location: null, topic: null }];
    expect(unexplainedEnd({ endsAt: aban(1, 12) }, one)).toBeNull();
    expect(unexplainedEnd({ endsAt: null }, one)).toBeNull();
    // A course from before sessions: 1 to 5 Aban, migrated as one session on the 1st.
    expect(unexplainedEnd({ endsAt: aban(5, 12) }, [{ ...one[0]!, endsAt: null }])).toEqual(
      aban(5, 12),
    );
  });

  it('points at the wrong field', () => {
    const { errors } = parseSessions({
      s0date: '1405/13/01',
      s0start: '10:00',
      s1date: '1405/08/01',
      s1start: '25:00',
      s2date: '1405/08/02',
      s2start: '10:00',
      s2end: '09:00',
      s3start: '10:00',
    });
    expect(Object.keys(errors).sort()).toEqual(['s0date', 's1start', 's2end', 's3date']);
  });

  it('refuses two sessions starting at the same moment', () => {
    const row = { date: '1405/08/01', start: '10:00' };
    const { errors } = parseSessions({
      s0date: row.date,
      s0start: row.start,
      s1date: row.date,
      s1start: row.start,
    });
    expect(errors).toHaveProperty('_sessions');
  });

  it('turns stored sessions back into form rows', () => {
    const values = sessionFormValues(
      [{ startsAt: aban(1, 9, 30), endsAt: aban(1, 12), location: null, topic: 'آشنایی' }],
      toPersianDigits,
    );
    expect(values).toEqual({
      s0date: '۱۴۰۵/۰۸/۰۱',
      s0start: '۰۹:۳۰',
      s0end: '۱۲:۰۰',
      s0location: '',
      s0topic: 'آشنایی',
    });
    expect(parseSessions(values).sessions[0]?.startsAt).toEqual(aban(1, 9, 30));
  });
});
