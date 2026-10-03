import { z } from 'zod';

/**
 * Shared Zod building blocks for public forms. Visitors type Persian or Arabic
 * digits, so every numeric-ish input is normalized to Latin digits before it is
 * validated and stored.
 */

const PERSIAN_ZERO = 0x06f0;
const ARABIC_ZERO = 0x0660;

export function toLatinDigits(text: string): string {
  return text.replace(/[۰-۹٠-٩]/g, (char) => {
    const code = char.charCodeAt(0);
    const base = code >= PERSIAN_ZERO ? PERSIAN_ZERO : ARABIC_ZERO;
    return String(code - base);
  });
}

/** Trims, and turns an empty string into `undefined` so optional fields stay optional. */
const blankToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export const requiredText = (label: string, max = 200) =>
  z.preprocess(
    blankToUndefined,
    z
      .string({ required_error: `${label} را وارد کنید.` })
      .max(max, `${label} بیش از حد طولانی است.`),
  );

export const optionalText = (label: string, max = 200) =>
  z.preprocess(blankToUndefined, z.string().max(max, `${label} بیش از حد طولانی است.`).optional());

const phonePattern = /^\+?[0-9]{8,14}$/;

const normalizePhone = (value: unknown) => {
  const text = blankToUndefined(value);
  return typeof text === 'string' ? toLatinDigits(text).replace(/[\s-]/g, '') : text;
};

type RequiredString = z.ZodEffects<z.ZodString, string, unknown>;
type OptionalString = z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;

export function phone(required: true): RequiredString;
export function phone(required: false): OptionalString;
export function phone(required: boolean): RequiredString | OptionalString;
export function phone(required: boolean) {
  const schema = z
    .string({ required_error: 'شماره تماس را وارد کنید.' })
    .regex(phonePattern, 'شماره تماس معتبر نیست.');
  return z.preprocess(normalizePhone, required ? schema : schema.optional());
}

/**
 * Iranian mobile number, normalized to `09xxxxxxxxx` (accepts +98 / 0098 / 98
 * prefixes, Persian digits, spaces and dashes). Used as the member login.
 */
export const mobilePhone = z.preprocess(
  (value) => {
    const text = normalizePhone(value);
    return typeof text === 'string' ? text.replace(/^(\+98|0098|98)(?=9\d{9}$)/, '0') : text;
  },
  z
    .string({ required_error: 'شماره همراه را وارد کنید.' })
    .regex(/^09\d{9}$/, 'شماره همراه باید به شکل ۰۹۱۲۳۴۵۶۷۸۹ باشد.'),
);

export function email(required: true): RequiredString;
export function email(required: false): OptionalString;
export function email(required: boolean): RequiredString | OptionalString;
export function email(required: boolean) {
  const schema = z
    .string({ required_error: 'ایمیل را وارد کنید.' })
    .email('ایمیل معتبر نیست.')
    .max(200);
  return z.preprocess(blankToUndefined, required ? schema : schema.optional());
}

/** شناسه ملی (11 digits, companies) or کد ملی (10 digits, individuals). */
export const nationalId = z.preprocess(
  (value) => {
    const text = blankToUndefined(value);
    return typeof text === 'string' ? toLatinDigits(text) : text;
  },
  z
    .string()
    .regex(/^(\d{10}|\d{11})$/, 'کد ملی یا شناسه ملی باید ۱۰ یا ۱۱ رقم باشد.')
    .optional(),
);

const digitsOnly = (value: unknown) => {
  const text = blankToUndefined(value);
  return typeof text === 'string' ? toLatinDigits(text).replace(/[\s-]/g, '') : text;
};

/** کد ملی: 10 digits with the official check digit (all-equal digits are refused). */
export function isValidNationalCode(code: string): boolean {
  if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false;
  const digits = [...code].map(Number);
  const sum = digits.slice(0, 9).reduce((total, digit, i) => total + digit * (10 - i), 0);
  const remainder = sum % 11;
  const check = digits[9]!;
  return remainder < 2 ? check === remainder : check === 11 - remainder;
}

/** شناسه ملی of a legal entity: 11 digits with the official check digit. */
export function isValidLegalNationalId(id: string): boolean {
  if (!/^\d{11}$/.test(id) || /^(\d)\1{10}$/.test(id)) return false;
  const digits = [...id].map(Number);
  const offset = digits[9]! + 2;
  const weights = [29, 27, 23, 19, 17, 29, 27, 23, 19, 17];
  const sum = weights.reduce((total, weight, i) => total + (digits[i]! + offset) * weight, 0);
  const remainder = sum % 11;
  return (remainder === 10 ? 0 : remainder) === digits[10];
}

/** A person's کد ملی (required). */
export const nationalCode = z.preprocess(
  digitsOnly,
  z
    .string({ required_error: 'کد ملی را وارد کنید.' })
    .regex(/^\d{10}$/, 'کد ملی باید ۱۰ رقم باشد.')
    .refine(isValidNationalCode, 'کد ملی معتبر نیست.'),
);

/** A legal entity's شناسه ملی (required). */
export const legalNationalId = z.preprocess(
  digitsOnly,
  z
    .string({ required_error: 'شناسه ملی شخص حقوقی را وارد کنید.' })
    .regex(/^\d{11}$/, 'شناسه ملی شخص حقوقی باید ۱۱ رقم باشد.')
    .refine(isValidLegalNationalId, 'شناسه ملی شخص حقوقی معتبر نیست.'),
);

/** Iranian postal code: 10 digits (required). */
export const postalCode = z.preprocess(
  digitsOnly,
  z
    .string({ required_error: 'کد پستی را وارد کنید.' })
    .regex(/^\d{10}$/, 'کد پستی باید ۱۰ رقم باشد.')
    .refine((code) => !/^(\d)\1{9}$/.test(code), 'کد پستی معتبر نیست.'),
);

/** Flattens a ZodError into one Persian message per field, for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_form');
    result[key] ??= issue.message;
  }
  return result;
}
