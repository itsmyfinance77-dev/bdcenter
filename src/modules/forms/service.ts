import { countCreatedPerDay } from '@/lib/daily-counts';
import { z } from 'zod';
import { prisma, Prisma } from '@/lib/prisma';
import { jalaliDateTime } from '@/lib/jalali';
import { fieldErrors, optionalText, requiredText, toLatinDigits } from '@/lib/validation';
import { parseRecipients } from '@/modules/settings/service';
import { requestStatusLabel } from '@/content/admin';
import { toCsv } from '@/lib/csv';
import { formatDateTime } from '@/lib/format';
import { richInput } from '@/lib/rich-html';
import { recordAudit } from '@/modules/audit/service';
import { consume, LIMITS } from '@/modules/ratelimit/service';
import {
  checkUpload,
  checkUploadContent,
  deleteStoredFile,
  storedFileSchema,
  storeUpload,
  type StoredFile,
} from '@/modules/files/service';
import { listStaff, submissionWhere, type SubmissionFilter } from './submissions';
import { formAvailability, type FormAvailability, type FormRules } from './availability';
import {
  CHOICE_TYPES,
  displayAnswer,
  FIELD_TYPES,
  fieldSettingsSchema,
  fileProblem,
  readSettings,
  settingsProblem,
  conditionProblem,
  valueSchema,
  visibleFieldKeys,
  type FieldType,
  type PrefillSource,
  type PublicFormField,
} from './fields';

export type { PublicFormField } from './fields';
export {
  addSubmissionNote,
  assignSubmission,
  assigneeSchema,
  countAnswers,
  filterQuery,
  getSubmissionForAdmin,
  hasFilter,
  listStaff,
  listSubmissions,
  noteSchema,
  parseSubmissionFilter,
  setSubmissionStatus,
  submissionContact,
  SUBMISSION_STATUSES,
  type SubmissionFilter,
  type SubmissionStatus,
  unreadDates,
} from './submissions';

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
  id: string;
  slug: string;
  title: string;
  description: string | null;
  descriptionHtml: string | null;
  fields: PublicFormField[];
  rules: FormRules;
  thankYouText: string | null;
};

const recipientsSchema = z.object({
  phones: z.array(z.string()),
  emails: z.array(z.string()),
});
export type FormRecipients = z.infer<typeof recipientsSchema>;

export async function listPublishedForms() {
  return prisma.formDefinition.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { title: 'asc' },
    select: { slug: true, title: true, description: true, closesAt: true, membersOnly: true },
  });
}

export async function getPublishedForm(slug: string): Promise<PublicForm | null> {
  const form = await prisma.formDefinition.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      descriptionHtml: true,
      opensAt: true,
      closesAt: true,
      maxSubmissions: true,
      membersOnly: true,
      onePerMember: true,
      thankYouText: true,
      fields: { orderBy: { sortOrder: 'asc' }, select: fieldSelect },
    },
  });
  if (!form) return null;
  const { opensAt, closesAt, maxSubmissions, membersOnly, onePerMember, fields, ...rest } = form;
  return {
    ...rest,
    fields: fields.map(publicField),
    rules: { opensAt, closesAt, maxSubmissions, membersOnly, onePerMember },
  };
}

/** Whether the form takes an answer now, for this visitor (null = not signed in). */
export async function getFormAvailability(
  form: PublicForm,
  memberId: string | null,
  now = new Date(),
): Promise<FormAvailability> {
  const [submissions, mine] = await Promise.all([
    form.rules.maxSubmissions === null
      ? 0
      : prisma.formSubmission.count({ where: { formId: form.id } }),
    memberId && form.rules.onePerMember
      ? prisma.formSubmission.count({ where: { formId: form.id, memberId } })
      : 0,
  ]);
  return formAvailability(form.rules, {
    now,
    submissions,
    signedIn: memberId !== null,
    memberAnswered: mine > 0,
  });
}

/** Starting values of a members-only form from the member's profile (field setting `prefill`). */
export function prefillValues(
  form: PublicForm,
  profile: Partial<Record<PrefillSource, string | null>>,
): Record<string, string> {
  if (!form.rules.membersOnly) return {};
  const values: Record<string, string> = {};
  for (const field of form.fields) {
    const value = field.settings.prefill ? profile[field.settings.prefill] : null;
    if (value) values[field.key] = value;
  }
  return values;
}

export type SubmitResult =
  | {
      ok: true;
      formTitle: string;
      thankYouText: string | null;
      submissionId: string;
      /** Where to send the "received" message, when the form asks for one. */
      confirmTo: { phone: string | null; email: string | null } | null;
      /** Staff to tell; null = the site-wide «فرم‌ها» recipients. */
      alertRecipients: FormRecipients | null;
    }
  | { ok: false; reason: 'not-found' | Exclude<FormAvailability, 'open'> }
  | { ok: false; reason: 'invalid'; errors: Record<string, string> };

/** What each stored submission remembers about the fields it was answered against. */
export type FieldSnapshot = { key: string; label: string; type: FieldType };

/** The person who answers a members-only form. */
export type FormMember = { id: string; phone: string; email: string | null };

/**
 * Validates raw answers (from FormData, see answersFrom) against the form's
 * current definition and stores the submission with a snapshot of the field
 * labels. The form's rules (dates, total limit, members-only, one answer per
 * member) are checked again with the form row locked, so two people cannot
 * both take the last place. Unknown keys are dropped; sections take no answer.
 */
export async function submitForm(
  slug: string,
  values: Record<string, FormDataEntryValue | FormDataEntryValue[] | undefined>,
  member: FormMember | null = null,
  now = new Date(),
): Promise<SubmitResult> {
  const form = await getPublishedForm(slug);
  if (!form) return { ok: false, reason: 'not-found' };
  const before = await getFormAvailability(form, member?.id ?? null, now);
  if (before !== 'open') return { ok: false, reason: before };

  const errors: Record<string, string> = {};
  const uploads: { key: string; file: File }[] = [];
  const inputs = form.fields.filter((field) => field.type !== 'SECTION');
  // Fields hidden by a condition are neither required nor stored.
  const shown = visibleFieldKeys(form.fields, values);
  const answered = inputs.filter((field) => shown.has(field.key));

  for (const field of answered.filter((f) => f.type === 'FILE')) {
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
    Object.fromEntries(
      answered.filter((f) => f.type !== 'FILE').map((f) => [f.key, valueSchema(f)]),
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
  const snapshot: FieldSnapshot[] = inputs.map(({ key, label, type }) => ({ key, label, type }));

  // Files are written before the lock (a slow upload must not hold up other
  // people sending this form) and removed again if no submission keeps them.
  const stored: StoredFile[] = [];
  const discard = () => Promise.allSettled(stored.map((file) => deleteStoredFile(file.storageKey)));
  let outcome: { state: 'open'; id: string } | { state: Exclude<FormAvailability, 'open'> };
  try {
    for (const { key, file } of uploads) {
      const saved = await storeUpload(`forms/${form.slug}`, file);
      stored.push(saved);
      data[key] = saved;
    }
    outcome = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM form_definitions WHERE id = ${form.id} FOR UPDATE`;
      const [submissions, mine] = await Promise.all([
        tx.formSubmission.count({ where: { formId: form.id } }),
        member ? tx.formSubmission.count({ where: { formId: form.id, memberId: member.id } }) : 0,
      ]);
      const state = formAvailability(form.rules, {
        now,
        submissions,
        signedIn: member !== null,
        memberAnswered: mine > 0,
      });
      if (state !== 'open') return { state };
      const created = await tx.formSubmission.create({
        data: {
          formId: form.id,
          memberId: member?.id ?? null,
          data: data as Prisma.InputJsonObject,
          fields: snapshot as Prisma.InputJsonArray,
        },
        select: { id: true },
      });
      return { state, id: created.id };
    });
  } catch (error) {
    await discard();
    throw error;
  }
  if (outcome.state !== 'open') {
    await discard();
    return { ok: false, reason: outcome.state };
  }

  const definition = await prisma.formDefinition.findUniqueOrThrow({
    where: { id: form.id },
    select: { confirmToApplicant: true, alertRecipients: true },
  });
  const confirmTo = definition.confirmToApplicant
    ? await confirmationContact(member, inputs, data)
    : null;
  const recipients = recipientsSchema.safeParse(definition.alertRecipients).data ?? null;
  return {
    ok: true,
    formTitle: form.title,
    thankYouText: form.thankYouText,
    submissionId: outcome.id,
    confirmTo,
    alertRecipients:
      recipients && recipients.phones.length + recipients.emails.length > 0 ? recipients : null,
  };
}

/**
 * Where the «your answer arrived» message goes. SMS only to a member's own
 * number, proven with a code: a number typed into a form could be anyone's,
 * and the site's SMS line must not be usable to pester strangers. Without a
 * member, an email to the form's first email answer, at most a few a day per
 * address.
 */
async function confirmationContact(
  member: FormMember | null,
  inputs: { key: string; type: FieldType }[],
  data: Record<string, unknown>,
): Promise<{ phone: string | null; email: string | null } | null> {
  if (member) return { phone: member.phone, email: member.email };
  const field = inputs.find((f) => f.type === 'EMAIL' && typeof data[f.key] === 'string');
  const email = field ? (data[field.key] as string) : null;
  if (!email || !(await consume(`form-confirm:${email.toLowerCase()}`, LIMITS.formConfirmEmail))) {
    return null;
  }
  return { phone: null, email };
}

// ---------------------------------------------------------------------------
// Admin: form builder and submissions
// ---------------------------------------------------------------------------

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
    // Form settings (package B).
    opensAt: jalaliDateTime('شروع پذیرش'),
    closesAt: jalaliDateTime('پایان پذیرش'),
    maxSubmissions: z.preprocess(
      (value) => {
        if (typeof value !== 'string') return value;
        const text = toLatinDigits(value).trim();
        return text === '' ? undefined : Number(text);
      },
      z
        .number({ invalid_type_error: 'سقف پاسخ‌ها را به عدد بنویسید.' })
        .int('سقف پاسخ‌ها باید عدد صحیح باشد.')
        .min(1, 'سقف پاسخ‌ها دست‌کم ۱ است.')
        .max(100_000, 'سقف پاسخ‌ها بیش از حد بزرگ است.')
        .optional(),
    ),
    membersOnly: z.preprocess((value) => value === 'on', z.boolean()),
    onePerMember: z.preprocess((value) => value === 'on', z.boolean()),
    confirmToApplicant: z.preprocess((value) => value === 'on', z.boolean()),
    thankYouText: optionalText('متن تشکر', 500),
    alertRecipients: optionalText('گیرندگان خبر', 2000).transform((text, ctx) => {
      const { phones, emails, invalid } = parseRecipients(text ?? '');
      if (invalid.length > 0) {
        ctx.addIssue({
          code: 'custom',
          message: `این موارد شمارهٔ همراه یا ایمیل معتبر نیستند: ${invalid.join('، ')}`,
        });
      }
      if (phones.length + emails.length > 20) {
        ctx.addIssue({ code: 'custom', message: 'حداکثر ۲۰ گیرنده.' });
      }
      return phones.length + emails.length > 0 ? { phones, emails } : null;
    }),
  })
  .superRefine((form, ctx) => {
    if (form.opensAt && form.closesAt && form.closesAt <= form.opensAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['closesAt'],
        message: 'پایان پذیرش باید بعد از شروع آن باشد.',
      });
    }
    if (form.onePerMember && !form.membersOnly) {
      ctx.addIssue({
        code: 'custom',
        path: ['onePerMember'],
        message: '«یک پاسخ برای هر عضو» فقط برای فرم‌های ویژهٔ اعضا ممکن است.',
      });
    }
    const seen = new Set<string>();
    form.fields.forEach((field, index) => {
      if (seen.has(field.key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['fields'],
          message: `کلید «${field.key}» تکراری است.`,
        });
      }
      seen.add(field.key);
      const problem = conditionProblem(field, form.fields.slice(0, index));
      if (problem) {
        ctx.addIssue({ code: 'custom', path: ['fields'], message: `«${field.label}»: ${problem}` });
      }
    });
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
    opensAt: input.opensAt,
    closesAt: input.closesAt,
    maxSubmissions: input.maxSubmissions ?? null,
    membersOnly: input.membersOnly,
    onePerMember: input.onePerMember,
    confirmToApplicant: input.confirmToApplicant,
    thankYouText: input.thankYouText ?? null,
    alertRecipients: input.alertRecipients ?? Prisma.DbNull,
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

/**
 * Copies a form with its fields and settings as a new draft («کپی فرم»):
 * title «… (کپی)», slug «…-copy» (or -copy-2, …). Answers are not copied.
 */
export async function duplicateForm(id: string, actorId: string): Promise<string | null> {
  const form = await prisma.formDefinition.findUnique({ where: { id }, include: { fields: true } });
  if (!form) return null;
  const taken = new Set(
    (
      await prisma.formDefinition.findMany({
        where: { slug: { startsWith: `${form.slug}-copy` } },
        select: { slug: true },
      })
    ).map((row) => row.slug),
  );
  let slug = `${form.slug}-copy`;
  for (let n = 2; taken.has(slug); n += 1) slug = `${form.slug}-copy-${n}`;

  const { id: _id, createdAt: _c, updatedAt: _u, fields, ...rest } = form;
  void _id;
  void _c;
  void _u;
  const copy = await prisma.formDefinition.create({
    data: {
      ...rest,
      alertRecipients: rest.alertRecipients ?? Prisma.DbNull,
      slug,
      title: `${form.title} (کپی)`,
      status: 'DRAFT',
      fields: {
        create: fields.map((field) => ({
          key: field.key,
          label: field.label,
          type: field.type,
          isRequired: field.isRequired,
          options: field.options ?? Prisma.DbNull,
          settings: field.settings ?? Prisma.DbNull,
          sortOrder: field.sortOrder,
        })),
      },
    },
  });
  await recordAudit({
    actorId,
    action: 'form.duplicate',
    entity: 'FormDefinition',
    entityId: copy.id,
    metadata: { from: form.id, slug },
  });
  return copy.id;
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

/**
 * The submissions a filter matches as CSV (UTF-8 with BOM so Excel shows
 * Persian correctly), oldest first.
 */
export async function exportSubmissionsCsv(
  formId: string,
  actorId: string,
  filter: SubmissionFilter = {},
) {
  const form = await getFormForAdmin(formId);
  if (!form) return null;
  const [submissions, staff] = await Promise.all([
    prisma.formSubmission.findMany({
      where: await submissionWhere(form.id, filter, actorId),
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { notes: true } } },
    }),
    listStaff(),
  ]);
  const staffName = new Map(staff.map((admin) => [admin.id, admin.fullName]));

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
  const header = [
    'تاریخ ثبت',
    'وضعیت',
    'مسئول پیگیری',
    'یادداشت‌ها',
    ...[...columns.values()].map((field) => field.label),
  ];
  const rows = submissions.map((submission) => {
    const data = submission.data as Record<string, unknown>;
    return [
      formatDateTime(submission.createdAt),
      requestStatusLabel[submission.status],
      submission.assigneeId ? (staffName.get(submission.assigneeId) ?? '') : '',
      String(submission._count.notes),
      ...[...columns.values()].map((field) => displayValue(data[field.key], field)),
    ];
  });
  await recordAudit({
    actorId,
    action: 'form.submission.export',
    entity: 'FormDefinition',
    entityId: form.id,
    // The typed search stays out of the log, like note texts.
    metadata: { rows: rows.length, filter: { ...filter, q: filter.q ? '…' : undefined } },
  });
  return { filename: `${form.slug}-submissions.csv`, content: toCsv([header, ...rows]) };
}

/** Form submissions per Tehran day, for the statistics dashboard. */
export function countSubmissionsPerDay(from: Date) {
  return countCreatedPerDay('submissions', from);
}
