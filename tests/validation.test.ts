import { describe, expect, it } from 'vitest';
import { attachmentDisposition, csvCell, toCsv } from '@/lib/csv';
import { formatJalaliInput, parseJalaliDateTime } from '@/lib/jalali';
import { slugify, slugPattern } from '@/lib/slug';
import { mobilePhone, nationalId, toLatinDigits } from '@/lib/validation';
import { safeMemberNext } from '@/modules/members/next-path';

describe('mobilePhone', () => {
  it.each([
    ['09121234567', '09121234567'],
    ['+989121234567', '09121234567'],
    ['00989121234567', '09121234567'],
    ['989121234567', '09121234567'],
    ['۰۹۱۲ ۱۲۳-۴۵۶۷', '09121234567'],
  ])('normalizes %s', (input, expected) => {
    expect(mobilePhone.parse(input)).toBe(expected);
  });

  it.each(['0912123456', '02112345678', '+98 21 1234 5678', '0912123456789', ''])(
    'rejects %s',
    (input) => {
      expect(mobilePhone.safeParse(input).success).toBe(false);
    },
  );
});

describe('nationalId and digits', () => {
  it('accepts 10 or 11 digits, in Persian digits too', () => {
    expect(nationalId.parse('۰۰۱۲۳۴۵۶۷۸')).toBe('0012345678');
    expect(nationalId.parse('10101234567')).toBe('10101234567');
    expect(nationalId.safeParse('123').success).toBe(false);
  });

  it('converts Persian and Arabic digits', () => {
    expect(toLatinDigits('۱۲۳٤٥٦')).toBe('123456');
  });
});

describe('safeMemberNext', () => {
  it.each(['/account', '/courses', '/courses/%D8%AF-x'])('keeps %s', (next) => {
    expect(safeMemberNext(next)).toBe(next);
  });

  it.each([
    '//evil.com',
    '/\\evil.com',
    'https://evil.com',
    '/courses//evil.com',
    '/admin',
    '/account?x=1',
    '/courses/a/../../admin',
    'javascript:alert(1)',
    null,
  ])('refuses %s', (next) => {
    expect(safeMemberNext(next)).toBe('/account');
  });
});

describe('slugify', () => {
  it('keeps Persian letters and turns half-spaces into hyphens', () => {
    const slug = slugify(`دوره ${String.fromCharCode(0x200c)}بازاریابی  دیجیتال!`);
    expect(slug).toBe('دوره-بازاریابی-دیجیتال');
    expect(slugPattern.test(slug)).toBe(true);
  });
});

describe('csv', () => {
  it('neutralizes spreadsheet formulas and quotes cells', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+98')).toBe(`"'+98"`);
    expect(csvCell('سلام')).toBe('"سلام"');
  });

  it('starts with a BOM for Excel', () => {
    expect(toCsv([['a']]).charCodeAt(0)).toBe(0xfeff);
  });

  it('builds an ASCII-only Content-Disposition for Persian names', () => {
    const header = attachmentDisposition('فرم "ویژه".csv');
    expect(/^[\x20-\x7e]*$/.test(header)).toBe(true);
    expect(() => new Response('x', { headers: { 'Content-Disposition': header } })).not.toThrow();
  });
});

describe('jalali', () => {
  it('round-trips a Tehran date-time', () => {
    const date = parseJalaliDateTime('۱۴۰۵/۰۷/۱۵ ۱۸:۳۰');
    expect(date?.toISOString()).toBe('2026-10-07T15:00:00.000Z');
    expect(date && formatJalaliInput(date)).toBe('1405/07/15 18:30');
  });

  it('rejects impossible dates', () => {
    expect(parseJalaliDateTime('1405/13/01 10:00')).toBeNull();
    expect(parseJalaliDateTime('not a date')).toBeNull();
  });
});
