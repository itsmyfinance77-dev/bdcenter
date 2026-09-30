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
import { requestStatusLabel } from '@/content/admin';
import { toCsv } from '@/lib/csv';
import { formatDateTime } from '@/lib/format';
import { recordAudit } from '@/modules/audit/service';
import {
  checkUpload,
  checkUploadContent,
  storedFileSchema,
  storeUpload,
  type StoredFile,
} from '@/modules/files/service';

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
    const problem = checkUpload(file) ?? (await checkUploadContent(file));
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

// ---------------------------------------------------------------------------
// Admin: form builder and submissions
// ---------------------------------------------------------------------------

const SUBMISSIONS_PAGE_SIZE = 20;

export async function listFormsForAdmin() {
  const forms = await prisma.formDefinition.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      _count: { select: { submissions: true, fields: true } },
    },
  });
  const newCounts = await prisma.formSubmission.groupBy({
    by: ['formId'],
    where: { status: 'NEW' },
    _count: true,
  });
  const newByForm = new Map(newCounts.map((row) => [row.formId, row._count]));
  return forms.map((form) => ({ ...form, newSubmissions: newByForm.get(form.id) ?? 0 }));
}

export async function getFormForAdmin(id: string) {
  return prisma.formDefinition.findUnique({
    where: { id },
    include: { fields: { orderBy: { sortOrder: 'asc' } } },
  });
}

const fieldTypes = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'EMAIL',
  'PHONE',
  'DATE',
  'SELECT',
  'FILE',
  'CHECKBOX',
] as const;

const formFieldInputSchema = z
  .object({
    key: z
      .string()
      .trim()
      .regex(
        /^[a-z][a-z0-9_]{0,39}$/,
        'کلید فیلد باید با حرف انگلیسی کوچک شروع شود (a-z، 0-9، _).',
      ),
    label: z.string().trim().min(1, 'برچسب فیلد را وارد کنید.').max(200),
    type: z.enum(fieldTypes),
    isRequired: z.boolean(),
    options: z.array(z.string().trim().min(1).max(200)).max(50),
  })
  .refine((field) => field.type !== 'SELECT' || field.options.length > 0, {
    message: 'فیلد انتخابی باید حداقل یک گزینه داشته باشد.',
    path: ['options'],
  });

export const formDefinitionInputSchema = z
  .object({
    title: requiredText('عنوان فرم', 200),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'نامک فقط حروف انگلیسی کوچک، عدد و خط تیره.'),
    description: optionalText('توضیحات', 1000),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
    fields: z.array(formFieldInputSchema).min(1, 'فرم باید حداقل یک فیلد داشته باشد.').max(60),
  })
  .superRefine((form, ctx) => {
    const seen = new Set<string>();
    for (const field of form.fields) {
      if (seen.has(field.key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['fields'],
          message: `کلید «${field.key}» تکراری است.`,
        });
      }
      seen.add(field.key);
    }
  });

export type FormDefinitionInput = z.infer<typeof formDefinitionInputSchema>;

/**
 * Creates or replaces a form definition and its fields. Past submissions keep
 * their stored data even if a field is renamed or removed later.
 */
export async function saveFormDefinition(
  id: string | null,
  input: FormDefinitionInput,
  actorId: string,
): Promise<{ ok: true; id: string } | { ok: false; errors: Record<string, string> }> {
  const clash = await prisma.formDefinition.findFirst({
    where: { slug: input.slug, NOT: id ? { id } : undefined },
    select: { id: true },
  });
  if (clash) return { ok: false, errors: { slug: 'این نامک قبلاً استفاده شده است.' } };

  const fields = input.fields.map((field, index) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    isRequired: field.isRequired,
    options: field.type === 'SELECT' ? field.options : undefined,
    sortOrder: index + 1,
  }));
  const definition = {
    title: input.title,
    slug: input.slug,
    description: input.description ?? null,
    status: input.status,
  };

  const form = await prisma.$transaction(async (tx) => {
    if (!id) {
      return tx.formDefinition.create({ data: { ...definition, fields: { create: fields } } });
    }
    await tx.formField.deleteMany({ where: { formId: id } });
    return tx.formDefinition.update({
      where: { id },
      data: { ...definition, fields: { create: fields } },
    });
  });

  await recordAudit({
    actorId,
    action: id ? 'form.update' : 'form.create',
    entity: 'FormDefinition',
    entityId: form.id,
    metadata: { slug: form.slug, fields: fields.length },
  });
  return { ok: true, id: form.id };
}

export async function listSubmissions(formId: string, page: number) {
  const [items, total] = await Promise.all([
    prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * SUBMISSIONS_PAGE_SIZE,
      take: SUBMISSIONS_PAGE_SIZE,
    }),
    prisma.formSubmission.count({ where: { formId } }),
  ]);
  return { items, pageCount: Math.max(1, Math.ceil(total / SUBMISSIONS_PAGE_SIZE)) };
}

export async function setSubmissionStatus(
  id: string,
  status: 'NEW' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'DONE',
  actorId: string,
) {
  await prisma.formSubmission.update({ where: { id }, data: { status } });
  await recordAudit({
    actorId,
    action: 'form.submission.status',
    entity: 'FormSubmission',
    entityId: id,
    metadata: { status },
  });
}

export async function countNewSubmissions() {
  return prisma.formSubmission.count({ where: { status: 'NEW' } });
}

/** The uploaded file stored under `fieldKey` of a submission, if any. */
export async function getSubmissionFile(submissionId: string, fieldKey: string) {
  const submission = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    select: { data: true },
  });
  const data = submission?.data as Record<string, unknown> | null | undefined;
  return storedFileSchema.safeParse(data?.[fieldKey]).data ?? null;
}

/** Human-readable value of one submitted field, for tables and CSV. */
export function displayValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  const file = storedFileSchema.safeParse(value);
  if (file.success) return file.data.originalName;
  return String(value);
}

/** All submissions of a form as CSV (UTF-8 with BOM so Excel shows Persian correctly). */
export async function exportSubmissionsCsv(formId: string, actorId: string) {
  const form = await getFormForAdmin(formId);
  if (!form) return null;
  const submissions = await prisma.formSubmission.findMany({
    where: { formId },
    orderBy: { createdAt: 'asc' },
  });

  const header = ['تاریخ ثبت', 'وضعیت', ...form.fields.map((field) => field.label)];
  const rows = submissions.map((submission) => {
    const data = submission.data as Record<string, unknown>;
    return [
      formatDateTime(submission.createdAt),
      requestStatusLabel[submission.status],
      ...form.fields.map((field) => displayValue(data[field.key])),
    ];
  });
  await recordAudit({
    actorId,
    action: 'form.submission.export',
    entity: 'FormDefinition',
    entityId: form.id,
    metadata: { rows: rows.length },
  });
  return { filename: `${form.slug}-submissions.csv`, content: toCsv([header, ...rows]) };
}
