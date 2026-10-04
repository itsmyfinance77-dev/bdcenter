import { z } from 'zod';
import { formatNumber } from '@/lib/format';
import { formatJalaliInput, parseJalaliDateTime } from '@/lib/jalali';
import {
  email,
  isValidLegalNationalId,
  isValidNationalCode,
  phone,
  toLatinDigits,
} from '@/lib/validation';

/**
 * Field types of the form builder and what each one accepts (owner's request
 * 2026-10-04, "advanced form builder", package A). Kept free of database code:
 * the public renderer, the builder and the tests share it.
 */

export const FIELD_TYPES = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'EMAIL',
  'PHONE',
  'MOBILE',
  'NATIONAL_CODE',
  'LEGAL_ID',
  'POSTAL_CODE',
  'JALALI_DATE',
  'TIME',
  'DATE',
  'SELECT',
  'RADIO',
  'MULTI_CHOICE',
  'RATING',
  'CHECKBOX',
  'FILE',
  'SECTION',
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/** Types whose answers are picked from the field's options. */
export const CHOICE_TYPES: ReadonlySet<FieldType> = new Set(['SELECT', 'RADIO', 'MULTI_CHOICE']);
/** Types that hold text a person types (placeholder, default, length limits). */
export const TEXT_TYPES: ReadonlySet<FieldType> = new Set(['TEXT', 'TEXTAREA']);

/** Groups of upload types a FILE field can be limited to. */
export const FILE_KINDS = {
  pdf: { label: 'PDF', types: ['application/pdf'] },
  image: { label: 'تصویر (JPG، PNG، WebP)', types: ['image/jpeg', 'image/png', 'image/webp'] },
  word: {
    label: 'Word',
    types: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  excel: {
    label: 'Excel',
    types: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
} as const;
export type FileKind = keyof typeof FILE_KINDS;
const FILE_KIND_KEYS = Object.keys(FILE_KINDS) as [FileKind, ...FileKind[]];

/** The global upload cap; a field may only lower it. */
export const MAX_FILE_MB = 10;

export const fieldSettingsSchema = z.object({
  /** Shown under the field (or under a SECTION heading). */
  hint: z.string().trim().max(500).optional(),
  placeholder: z.string().trim().max(100).optional(),
  defaultValue: z.string().trim().max(200).optional(),
  minLength: z.number().int().min(1).max(4000).optional(),
  maxLength: z.number().int().min(1).max(4000).optional(),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  fileKinds: z.array(z.enum(FILE_KIND_KEYS)).max(FILE_KIND_KEYS.length).optional(),
  maxSizeMb: z.number().int().min(1).max(MAX_FILE_MB).optional(),
  /** RATING: the highest score (default 5). */
  scale: z.number().int().min(3).max(10).optional(),
});
export type FieldSettings = z.infer<typeof fieldSettingsSchema>;

/** Stored settings, or none when the JSON is missing or malformed. */
export function readSettings(value: unknown): FieldSettings {
  return fieldSettingsSchema.safeParse(value ?? {}).data ?? {};
}

export type PublicFormField = {
  key: string;
  label: string;
  type: FieldType;
  isRequired: boolean;
  options: string[];
  settings: FieldSettings;
};

/** Hard caps per text type; a field's maxLength can only be lower. */
const TEXT_CAP: Partial<Record<FieldType, number>> = { TEXT: 500, TEXTAREA: 4000 };

const blank = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;
const digits = (value: unknown) => {
  const text = blank(value);
  return typeof text === 'string' ? toLatinDigits(text).replace(/[\s-]/g, '') : text;
};

/**
 * A text value, required or not, then `check` on what was typed: `check`
 * returns the stored form of the value, or an error message.
 */
function checked(
  label: string,
  required: boolean,
  max: number,
  prepare: (value: unknown) => unknown,
  check: (text: string) => { value: string } | { error: string },
) {
  const base = z
    .string({ required_error: `${label} را وارد کنید.` })
    .max(max, `${label} بیش از حد طولانی است.`);
  return z.preprocess(prepare, required ? base : base.optional()).transform((text, ctx) => {
    if (text === undefined) return undefined;
    const result = check(text);
    if ('error' in result) {
      ctx.addIssue({ code: 'custom', message: result.error });
      return z.NEVER;
    }
    return result.value;
  });
}

// Built from code points: the editing tools turn \u escapes into look-alike characters.
const ARABIC_DECIMAL = new RegExp(String.fromCharCode(0x066b), 'g');
const SEPARATOR = `[${String.fromCharCode(0x066c)},]`;
const GROUPED = new RegExp(`^-?\\d{1,3}(${SEPARATOR}\\d{3})+(\\.\\d+)?$`);
const SEPARATORS = new RegExp(SEPARATOR, 'g');

/**
 * A number as typed on a Persian keyboard — Persian/Arabic digits, «٫» as the
 * decimal mark, «٬» or «,» between groups of three — in plain form ("1200.5"),
 * or null when it is not a number. A comma anywhere else ("12,5") is refused
 * rather than guessed: it may be meant as a decimal mark.
 */
export function latinNumber(text: string): string | null {
  const plain = toLatinDigits(text).replace(ARABIC_DECIMAL, '.').replace(/\s/g, '');
  const ungrouped = GROUPED.test(plain) ? plain.replace(SEPARATORS, '') : plain;
  return /^-?\d+(\.\d+)?$/.test(ungrouped) ? ungrouped : null;
}

const trimmed = (value: unknown) =>
  typeof blank(value) === 'string' ? (value as string).trim() : undefined;

/** What one field accepts; the parsed value is what gets stored. */
export function valueSchema(field: PublicFormField): z.ZodTypeAny {
  const { label, isRequired: required, settings } = field;
  const n = (value: number) => formatNumber(value);

  switch (field.type) {
    case 'TEXT':
    case 'TEXTAREA': {
      const cap = Math.min(TEXT_CAP[field.type]!, settings.maxLength ?? Infinity);
      return checked(label, required, cap, trimmed, (text) =>
        settings.minLength && text.length < settings.minLength
          ? { error: `${label} باید دست‌کم ${n(settings.minLength)} نویسه باشد.` }
          : { value: text },
      );
    }
    case 'EMAIL':
      return email(required);
    case 'PHONE':
      return phone(required);
    case 'NUMBER':
      return checked(label, required, 30, trimmed, (text) => {
        const plain = latinNumber(text);
        const value = Number(plain);
        if (plain === null || !Number.isFinite(value)) {
          return { error: `${label} باید عدد باشد (برای اعشار از «٫» یا «.» استفاده کنید).` };
        }
        if (settings.min !== undefined && value < settings.min) {
          return { error: `${label} نباید کمتر از ${n(settings.min)} باشد.` };
        }
        if (settings.max !== undefined && value > settings.max) {
          return { error: `${label} نباید بیشتر از ${n(settings.max)} باشد.` };
        }
        return { value: String(value) };
      }).transform((value) => (value === undefined ? undefined : Number(value)));
    case 'MOBILE':
      return checked(label, required, 20, digits, (text) => {
        const mobile = text.replace(/^(\+98|0098|98)(?=9\d{9}$)/, '0');
        return /^09\d{9}$/.test(mobile)
          ? { value: mobile }
          : { error: `${label} باید به شکل ۰۹۱۲۳۴۵۶۷۸۹ باشد.` };
      });
    case 'NATIONAL_CODE':
      return checked(label, required, 20, digits, (text) =>
        isValidNationalCode(text) ? { value: text } : { error: `${label} معتبر نیست.` },
      );
    case 'LEGAL_ID':
      return checked(label, required, 20, digits, (text) =>
        isValidLegalNationalId(text) ? { value: text } : { error: `${label} معتبر نیست.` },
      );
    case 'POSTAL_CODE':
      return checked(label, required, 20, digits, (text) =>
        /^\d{10}$/.test(text) && !/^(\d)\1{9}$/.test(text)
          ? { value: text }
          : { error: `${label} باید ۱۰ رقم باشد.` },
      );
    case 'JALALI_DATE':
      return checked(label, required, 20, trimmed, (text) => {
        const date = /^[\d۰-۹]{4}[/-][\d۰-۹]{1,2}[/-][\d۰-۹]{1,2}$/.test(text)
          ? parseJalaliDateTime(text)
          : null;
        return date
          ? { value: formatJalaliInput(date).slice(0, 10) }
          : { error: `${label} را به شکل ۱۴۰۵/۰۷/۱۵ بنویسید.` };
      });
    case 'TIME':
      return checked(label, required, 10, trimmed, (text) => {
        const match = /^(\d{1,2}):(\d{2})$/.exec(toLatinDigits(text));
        return match && Number(match[1]) < 24 && Number(match[2]) < 60
          ? { value: `${match[1]!.padStart(2, '0')}:${match[2]}` }
          : { error: `${label} را به شکل ۱۶:۳۰ بنویسید.` };
      });
    case 'DATE':
      return checked(label, required, 10, trimmed, (text) =>
        /^\d{4}-\d{2}-\d{2}$/.test(text) ? { value: text } : { error: `${label} معتبر نیست.` },
      );
    case 'SELECT':
    case 'RADIO':
      return checked(label, required, 200, trimmed, (text) =>
        field.options.includes(text)
          ? { value: text }
          : { error: `یکی از گزینه‌های ${label} را انتخاب کنید.` },
      );
    case 'MULTI_CHOICE':
      return z
        .preprocess(
          (value) =>
            (Array.isArray(value) ? value : value === undefined ? [] : [value]).filter(
              (item) => typeof item === 'string' && item !== '',
            ),
          z.array(z.string()).max(field.options.length),
        )
        .superRefine((values, ctx) => {
          if (required && values.length === 0) {
            ctx.addIssue({
              code: 'custom',
              message: `دست‌کم یکی از گزینه‌های ${label} را انتخاب کنید.`,
            });
          } else if (values.some((value) => !field.options.includes(value))) {
            ctx.addIssue({ code: 'custom', message: `گزینه‌های ${label} معتبر نیستند.` });
          }
        })
        .transform((values) => (values.length === 0 ? undefined : [...new Set(values)]));
    case 'RATING': {
      const scale = settings.scale ?? 5;
      return checked(label, required, 3, trimmed, (text) => {
        const value = Number(toLatinDigits(text));
        return Number.isInteger(value) && value >= 1 && value <= scale
          ? { value: String(value) }
          : { error: `یک امتیاز از ۱ تا ${n(scale)} برای ${label} انتخاب کنید.` };
      }).transform((value) => (value === undefined ? undefined : Number(value)));
    }
    case 'CHECKBOX':
      return z
        .preprocess((value) => value === 'on', z.boolean())
        .refine((isChecked) => !required || isChecked, `تأیید «${label}» الزامی است.`);
    case 'FILE':
    case 'SECTION':
      // Files are checked separately (see fileProblem); sections take no input.
      return z.any();
  }
}

/** Why an uploaded file does not suit this field's own limits, or null. */
export function fileProblem(file: { size: number; type: string }, settings: FieldSettings) {
  const maxMb = settings.maxSizeMb ?? MAX_FILE_MB;
  if (file.size > maxMb * 1024 * 1024) {
    return `حجم فایل نباید بیشتر از ${formatNumber(maxMb)} مگابایت باشد.`;
  }
  const kinds = settings.fileKinds?.length ? settings.fileKinds : null;
  if (
    kinds &&
    !kinds.some((kind) => (FILE_KINDS[kind].types as readonly string[]).includes(file.type))
  ) {
    return `فقط این نوع فایل‌ها پذیرفته می‌شوند: ${kinds.map((kind) => FILE_KINDS[kind].label).join('، ')}.`;
  }
  return null;
}

/** Problems with a field's own definition in the builder (Persian), or null. */
export function settingsProblem(type: FieldType, settings: FieldSettings, options: string[]) {
  if (CHOICE_TYPES.has(type) && options.length === 0) {
    return 'این فیلد باید حداقل یک گزینه داشته باشد.';
  }
  if (settings.minLength && settings.maxLength && settings.minLength > settings.maxLength) {
    return 'حداقل طول نباید از حداکثر طول بیشتر باشد.';
  }
  if (settings.min !== undefined && settings.max !== undefined && settings.min > settings.max) {
    return 'حداقل عدد نباید از حداکثر عدد بیشتر باشد.';
  }
  if (settings.defaultValue && type === 'MULTI_CHOICE') {
    return 'چندگزینه‌ای گزینهٔ پیش‌فرض ندارد.';
  }
  if (settings.defaultValue && CHOICE_TYPES.has(type)) {
    if (!options.includes(settings.defaultValue)) return 'مقدار پیش‌فرض باید یکی از گزینه‌ها باشد.';
  }
  return null;
}

/** Human-readable value of one submitted answer, for the panel and CSV. */
export function displayAnswer(value: unknown, type?: string, settings?: FieldSettings): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  if (Array.isArray(value)) return value.map(String).join('، ');
  if (type === 'RATING' && typeof value === 'number') {
    return `${formatNumber(value)} از ${formatNumber(settings?.scale ?? 5)}`;
  }
  if (typeof value === 'object' && 'originalName' in value) {
    return String((value as { originalName: unknown }).originalName);
  }
  return String(value);
}

/**
 * Raw answers from FormData: a name sent more than once (multi-choice boxes)
 * becomes an array; files are kept as File objects.
 */
export function answersFrom(
  formData: FormData,
): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const answers: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const key of new Set(formData.keys())) {
    const all = formData.getAll(key);
    answers[key] = all.length > 1 ? all : all[0]!;
  }
  return answers;
}
