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

/** Flattens a ZodError into one Persian message per field, for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_form');
    result[key] ??= issue.message;
  }
  return result;
}
