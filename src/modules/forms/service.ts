import { countCreatedPerDay } from '@/lib/daily-counts';
import { z } from 'zod';
import { prisma, type Prisma } from '@/lib/prisma';
import { fieldErrors, optionalText, requiredText } from '@/lib/validation';
import { requestStatusLabel } from '@/content/admin';
import { toCsv } from '@/lib/csv';
import { formatDateTime } from '@/lib/format';
import { richInput } from '@/lib/rich-html';
import { recordAudit } from '@/modules/audit/service';
import {
  checkUpload,
  checkUploadContent,
  storedFileSchema,
  storeUpload,
  type StoredFile,
} from '@/modules/files/service';
import {
  CHOICE_TYPES,
  displayAnswer,
  FIELD_TYPES,
  fieldSettingsSchema,
  fileProblem,
  readSettings,
  settingsProblem,
  valueSchema,
  type FieldType,
  type PublicFormField,
} from './fields';

export type { PublicFormField } from './fields';

/**
 * Dynamic form builder ("فرم‌ساز" / "میز خدمت"). Staff define fields in the
 * admin panel; this module renders their definition publicly and validates
 * submissions against it at request time. Field types and their rules live
 * in ./fields.ts.
 */

const fieldSelect = {
  key: true,
  label: true,
  type: true,
  isRequired: true,
  options: true,
  settings: true,
} as const;

const choiceOptionsSchema = z.array(z.string().min(1));

/** A stored field row as the renderer and validators need it. */
function publicField(field: {
  key: string;
  label: string;
  type: FieldType;
  isRequired: boolean;
  options: unknown;
  settings: unknown;
}): PublicFormField {
  return {
    key: field.key,
    label: field.label,
    type: field.type,
    isRequired: field.isRequired,
    options: choiceOptionsSchema.safeParse(field.options).data ?? [],
    settings: readSettings(field.settings),
  };
}

export type PublicForm = {
  slug: string;
  title: string;
  description: string | null;
  descriptionHtml: string | null;
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
      descriptionHtml: true,
      fields: { orderBy: { sortOrder: 'asc' }, select: fieldSelect },
    },
  });
  if (!form) return null;
  return { ...form, fields: form.fields.map(publicField) };
}

export type SubmitResult =
  | { ok: true; formTitle: string }
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'invalid'; errors: Record<string, string> };

/** What each stored submission remembers about the fields it was answered against. */
export type FieldSnapshot = { key: string; label: string; type: FieldType };

/**
 * Validates raw answers (from FormData, see answersFrom) against the form's
 * current definition and stores the submission with a snapshot of the field
 * labels. Unknown keys are dropped; sections take no answer.
 */
export async function submitForm(
  slug: string,
  values: Record<string, FormDataEntryValue | FormDataEntryValue[] | undefined>,
): Promise<SubmitResult> {
  const form = await getPublishedForm(slug);
  if (!form) return { ok: false, reason: 'not-found' };

  const errors: Record<string, string> = {};
  const uploads: { key: string; file: File }[] = [];
  const inputs = form.fields.filter((field) => field.type !== 'SECTION');

  for (const field of inputs.filter((f) => f.type === 'FILE')) {
    const value = values[field.key];
    const file = value instanceof File && value.size > 0 ? value : null;
    if (!file) {
      if (field.isRequired) errors[field.key] = `${field.label} را بارگذاری کنید.`;
      continue;
    }
    const problem =
      checkUpload(file) ?? fileProblem(file, field.settings) ?? (await checkUploadContent(file));
    if (problem) errors[field.key] = problem;
    else uploads.push({ key: field.key, file });
  }

  const schema = z.object(
    Object.fromEntries(inputs.filter((f) => f.type !== 'FILE').map((f) => [f.key, valueSchema(f)])),
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
  const snapshot: FieldSnapshot[] = inputs.map(({ key, label, type }) => ({ key, label, type }));

  await prisma.formSubmission.create({
    data: {
      form: { connect: { slug: form.slug } },
      data: data as Prisma.InputJsonObject,
      fields: snapshot as Prisma.InputJsonArray,
    },
  });
  return { ok: true, formTitle: form.title };
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
    type: z.enum(FIELD_TYPES),
    isRequired: z.boolean(),
    options: z.array(z.string().trim().min(1).max(200)).max(50),
    settings: fieldSettingsSchema.default({}),
  })
  .superRefine((field, ctx) => {
    const problem = settingsProblem(field.type, field.settings, field.options);
    if (problem) ctx.addIssue({ code: 'custom', path: ['settings'], message: problem });
  });

export const formDefinitionInputSchema = z
  .object({
    title: requiredText('عنوان فرم', 200),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'نامک فقط حروف انگلیسی کوچک، عدد و خط تیره.'),
    // HTML from the rich editor (ADR-0005).
    description: optionalText('توضیحات', 100_000),
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
    // A heading is never required; only choice fields keep options.
    isRequired: field.type === 'SECTION' ? false : field.isRequired,
    options: CHOICE_TYPES.has(field.type) ? field.options : undefined,
    settings: field.settings as Prisma.InputJsonObject,
    sortOrder: index + 1,
  }));
  const description = richInput(input.description);
  const definition = {
    title: input.title,
    slug: input.slug,
    description: description.text,
    descriptionHtml: description.html,
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
export function displayValue(value: unknown, field?: { type: string; settings?: unknown }): string {
  const file = storedFileSchema.safeParse(value);
  if (file.success) return file.data.originalName;
  return displayAnswer(value, field?.type, field ? readSettings(field.settings) : undefined);
}

const snapshotSchema = z.array(
  z.object({ key: z.string(), label: z.string(), type: z.enum(FIELD_TYPES) }),
);

/**
 * The fields to show for one submission: the ones it was answered against
 * (its snapshot, with the labels of that time), or, for submissions from
 * before snapshots, the form's current fields. Sections are left out.
 */
export function submissionFields(
  submission: { fields: unknown },
  current: { key: string; label: string; type: FieldType; settings?: unknown }[],
) {
  const snapshot = snapshotSchema.safeParse(submission.fields).data;
  const settingsOf = new Map(current.map((field) => [field.key, field.settings]));
  return (snapshot ?? current)
    .filter((field) => field.type !== 'SECTION')
    .map((field) => ({ ...field, settings: settingsOf.get(field.key) }));
}

/** All submissions of a form as CSV (UTF-8 with BOM so Excel shows Persian correctly). */
export async function exportSubmissionsCsv(formId: string, actorId: string) {
  const form = await getFormForAdmin(formId);
  if (!form) return null;
  const submissions = await prisma.formSubmission.findMany({
    where: { formId },
    orderBy: { createdAt: 'asc' },
  });

  // Columns: today's fields, then any field only older submissions have.
  const columns = new Map<
    string,
    { key: string; label: string; type: FieldType; settings?: unknown }
  >();
  for (const field of form.fields.filter((f) => f.type !== 'SECTION'))
    columns.set(field.key, field);
  for (const submission of submissions) {
    for (const field of submissionFields(submission, [])) {
      if (!columns.has(field.key)) columns.set(field.key, field);
    }
  }
  const header = ['تاریخ ثبت', 'وضعیت', ...[...columns.values()].map((field) => field.label)];
  const rows = submissions.map((submission) => {
    const data = submission.data as Record<string, unknown>;
    return [
      formatDateTime(submission.createdAt),
      requestStatusLabel[submission.status],
      ...[...columns.values()].map((field) => displayValue(data[field.key], field)),
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

/** Form submissions per Tehran day, for the statistics dashboard. */
export function countSubmissionsPerDay(from: Date) {
  return countCreatedPerDay('submissions', from);
}
