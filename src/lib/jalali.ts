import { z } from 'zod';
import { optionalText, toLatinDigits } from './validation';

/**
 * Solar Hijri (Jalali) <-> Gregorian conversion for admin date inputs, so
 * editors type dates the way they read them: ۱۴۰۵/۰۷/۱۵ ۱۸:۳۰ (Tehran time).
 * Algorithm: the widely used jalaali-js arithmetic (valid for 1-3177 SH).
 */

const TEHRAN_OFFSET = '+03:30'; // Iran has not observed DST since 2022.

function div(a: number, b: number) {
  return Math.trunc(a / b);
}

function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy += 1595;
  let days =
    -355668 +
    365 * jy +
    div(jy, 33) * 8 +
    div((jy % 33) + 3, 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthDays = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  while (gm <= 12 && gd > monthDays[gm]!) {
    gd -= monthDays[gm]!;
    gm++;
  }
  return [gy, gm, gd];
}

const pattern = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/;

/** Parses "1405/07/15" or "1405/07/15 18:30" (any digit script) as Tehran time. */
export function parseJalaliDateTime(text: string): Date | null {
  const match = pattern.exec(toLatinDigits(text.trim()));
  if (!match) return null;
  const [jy, jm, jd, hh = 0, mm = 0] = match.slice(1).map((part) => Number(part ?? 0)) as number[];
  if (jm! < 1 || jm! > 12 || jd! < 1 || jd! > (jm! <= 6 ? 31 : 30) || hh! > 23 || mm! > 59) {
    return null;
  }
  const [gy, gm, gd] = jalaliToGregorian(jy!, jm!, jd!);
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = new Date(`${gy}-${pad(gm)}-${pad(gd)}T${pad(hh!)}:${pad(mm!)}:00${TEHRAN_OFFSET}`);
  if (Number.isNaN(date.getTime())) return null;
  // Rejects day 30 of Esfand in a non-leap year, which converts to 1 Farvardin.
  const expected = `${jy}/${pad(jm!)}/${pad(jd!)}`;
  return formatJalaliInput(date).startsWith(expected) ? date : null;
}

const partsFormat = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Tehran',
});

/** Inverse of `parseJalaliDateTime`, for pre-filling inputs: "1405/07/15 18:30". */
export function formatJalaliInput(date: Date): string {
  const parts = Object.fromEntries(partsFormat.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

/** Optional form field for a Solar Hijri date-time; parses to a Date or null. */
export const jalaliDateTime = (label: string) =>
  optionalText(label, 30).transform((value, ctx) => {
    if (value === undefined) return null;
    const date = parseJalaliDateTime(value);
    if (!date) {
      ctx.addIssue({ code: 'custom', message: `${label} را به شکل ۱۴۰۵/۰۷/۱۵ ۱۸:۳۰ وارد کنید.` });
      return z.NEVER;
    }
    return date;
  });
