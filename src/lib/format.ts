/** Persian-locale display helpers. UI numbers and dates always go through these. */

const numberFormat = new Intl.NumberFormat('fa-IR', { useGrouping: false });
const dateFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  dateStyle: 'long',
  timeZone: 'Asia/Tehran',
});
const yearFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  timeZone: 'Asia/Tehran',
});
const dateTimeFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Asia/Tehran',
});

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** Replaces every Latin digit in free text (e.g. a phone number) with its Persian form. */
export function toPersianDigits(text: string): string {
  return text.replace(/\d/g, (digit) => numberFormat.format(Number(digit)));
}

/** Solar Hijri year, e.g. ۱۴۰۵. */
export function formatYear(date: Date): string {
  return yearFormat.format(date);
}

export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date);
}
