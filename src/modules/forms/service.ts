import { z } from 'zod';
import { prisma, type FormFieldType, type Prisma } from '@/lib/prisma';
import {
  email,
  fieldErrors,
  optionalText,
  phone,
  requiredText,
  toLatinDigits,
} from '@/lib/validation';
import { checkUpload, storeUpload, type StoredFile } from '@/modules/files/service';

/**
 * Dynamic form builder ("فرم‌ساز" / "میز خدمت"). Staff define fields in the
 * admin panel; this module renders their definition publicly and validates
 * submissions against it at request time.
 */

const fieldSelect = {
  key: true,
  label: true,
  type: true,
  isRequired: true,
  options: true,
} as const;

const selectOptionsSchema = z.array(z.string().min(1));

export type PublicFormField = {
  key: string;
  label: string;
  type: FormFieldType;
  isRequired: boolean;
  options: string[];
};

export type PublicForm = {
  slug: string;
  title: string;
  description: string | null;
  fields: PublicFormField[];
};

export async function listPublishedForms() {
  return prisma.formDefinition.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { title: 'asc' },
    select: { slug: true, title: true, description: true },
  });
}

export async function getPublishedForm(slug: string): Promise<PublicForm | null> {
  const form = await prisma.formDefinition.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: {
      slug: true,
      title: true,
      description: true,
      fields: { orderBy: { sortOrder: 'asc' }, select: fieldSelect },
    },
  });
  if (!form) return null;
  return {
    ...form,
    fields: form.fields.map((field) => ({
      ...field,
      options: selectOptionsSchema.safeParse(field.options).data ?? [],
    })),
  };
}

function valueSchema(field: PublicFormField): z.ZodTypeAny {
  const { label, isRequired: required } = field;
  const text = (max: number) => (required ? requiredText(label, max) : optionalText(label, max));

  switch (field.type) {
    case 'TEXT':
      return text(500);
    case 'TEXTAREA':
      return text(4000);
    case 'EMAIL':
      return email(required);
    case 'PHONE':
      return phone(required);
    case 'NUMBER':
      return text(30)
        .transform((value) => (value === undefined ? undefined : Number(toLatinDigits(value))))
        .refine(
          (value) => value === undefined || Number.isFinite(value),
          `${label} باید عدد باشد.`,
        );
    case 'DATE':
      return text(10).refine(
        (value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value),
        `${label} معتبر نیست.`,
      );
    case 'SELECT':
      return text(200).refine(
        (value) => value === undefined || field.options.includes(value),
        `یکی از گزینه‌های ${label} را انتخاب کنید.`,
      );
    case 'CHECKBOX':
      return z
        .preprocess((value) => value === 'on', z.boolean())
        .refine((checked) => !required || checked, `تأیید «${label}» الزامی است.`);
    case 'FILE':
      // Files are validated separately in `submitForm`, not through Zod.
      return z.any();
  }
}

export type SubmitResult =
  | { ok: true }
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'invalid'; errors: Record<string, string> };

/**
 * Validates raw values (from FormData) against the form's current definition
 * and stores the submission. Unknown keys are dropped.
 */
export async function submitForm(
  slug: string,
  values: Record<string, FormDataEntryValue | undefined>,
): Promise<SubmitResult> {
  const form = await getPublishedForm(slug);
  if (!form) return { ok: false, reason: 'not-found' };

  const errors: Record<string, string> = {};
  const uploads: { key: string; file: File }[] = [];

  for (const field of form.fields.filter((f) => f.type === 'FILE')) {
    const value = values[field.key];
    const file = value instanceof File && value.size > 0 ? value : null;
    if (!file) {
      if (field.isRequired) errors[field.key] = `${field.label} را بارگذاری کنید.`;
      continue;
    }
    const problem = checkUpload(file);
    if (problem) errors[field.key] = problem;
    else uploads.push({ key: field.key, file });
  }

  const schema = z.object(
    Object.fromEntries(
      form.fields.filter((f) => f.type !== 'FILE').map((f) => [f.key, valueSchema(f)]),
    ),
  );
  const parsed = schema.safeParse(values);
  if (!parsed.success) Object.assign(errors, fieldErrors(parsed.error));

  if (!parsed.success || Object.keys(errors).length > 0) {
    return { ok: false, reason: 'invalid', errors };
  }

  const data: Record<string, unknown> = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined),
  );
  for (const { key, file } of uploads) {
    data[key] = (await storeUpload(`forms/${form.slug}`, file)) satisfies StoredFile;
  }

  await prisma.formSubmission.create({
    data: {
      form: { connect: { slug: form.slug } },
      data: data as Prisma.InputJsonObject,
    },
  });
  return { ok: true };
}
