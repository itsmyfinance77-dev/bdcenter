import { describe, expect, it } from 'vitest';
import { lastDays, tehranDayKey } from '@/lib/daily-counts';
import { normalizeTrackedPath } from '@/modules/stats/service';

describe('page-view paths', () => {
  it('keeps public paths, without query, fragment or trailing slash', () => {
    expect(normalizeTrackedPath('/')).toBe('/');
    expect(normalizeTrackedPath('/news?view=all#x')).toBe('/news');
    expect(normalizeTrackedPath('/courses/')).toBe('/courses');
    expect(normalizeTrackedPath('/events/%D9%86%D8%B4%D8%B3%D8%AA')).toBe('/events/نشست');
  });

  it('drops private areas, machinery and junk', () => {
    for (const path of [
      '/admin',
      '/admin/stats',
      '/account/login',
      '/api/pv',
      '/_next/static/x.js',
      '//evil.example',
      'https://evil.example/',
      '/%E0%A4%A',
      '/a\u0000b',
      `/${'x'.repeat(250)}`,
      42,
      null,
    ]) {
      expect(normalizeTrackedPath(path)).toBeNull();
    }
  });
});

describe('Tehran day keys', () => {
  it('rolls over at Tehran midnight, not UTC midnight', () => {
    expect(tehranDayKey(new Date('2026-10-01T20:29:00Z'))).toBe('2026-10-01');
    expect(tehranDayKey(new Date('2026-10-01T20:31:00Z'))).toBe('2026-10-02');
  });

  it('lists the last N days, oldest first, ending today', () => {
    const days = lastDays(7, new Date('2026-10-02T08:00:00Z'));
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-09-26');
    expect(days.at(-1)).toBe('2026-10-02');
  });
});
