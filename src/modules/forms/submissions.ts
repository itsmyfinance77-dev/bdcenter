import { z } from 'zod';
import { formatNumber, toPersianDigits } from '@/lib/format';
import { parseJalaliDateTime } from '@/lib/jalali';
import { prisma, Prisma } from '@/lib/prisma';
import { toLatinDigits } from '@/lib/validation';
import { recordAudit } from '@/modules/audit/service';
import { listAdmins } from '@/modules/auth/users';
import { getMemberContact } from '@/modules/members/service';
import { CHOICE_TYPES, readSettings, type FieldType } from './fields';

/**
 * Staff work on form submissions: filters and search, assignee, notes, status
 * changes and the answer counts behind the charts. Re-exported by service.ts.
 */

export const SUBMISSION_STATUSES = ['NEW', 'IN_REVIEW', 'ACCEPTED', 'REJECTED', 'DONE'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

const SUBMISSIONS_PAGE_SIZE = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const optionalQuery = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .catch(undefined)
    .transform((value) => value || undefined);

/**
 * The list's filters, read from the address bar. Anything malformed is
 * dropped rather than refused: a bad link still shows the list.
 */
const filterSchema = z.object({
  status: z.enum(SUBMISSION_STATUSES).optional().catch(undefined),
  /** «me», «none» or a staff member's id. */
  assignee: z
    .string()
    .regex(/^(me|none|[a-z0-9]{20,40})$/)
    .optional()
    .catch(undefined),
  q: optionalQuery(100),
  /** Jalali days, e.g. 1405/08/01; `to` includes its whole day. */
  from: optionalQuery(20),
  to: optionalQuery(20),
});
export type SubmissionFilter = z.infer<typeof filterSchema>;

export function parseSubmissionFilter(
  query: Record<string, string | string[] | undefined>,
): SubmissionFilter {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  return filterSchema.parse({
    status: first(query.status),
    assignee: first(query.assignee),
    q: first(query.q),
    from: first(query.from),
    to: first(query.to),
  });
}

/** The filter as an address-bar query (without `?`), for links and the export. */
export function filterQuery(filter: SubmissionFilter): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) if (value) params.set(key, value);
  return params.toString();
}

export function hasFilter(filter: SubmissionFilter): boolean {
  return Object.values(filter).some(Boolean);
}

/** Start of a Jalali day typed as 1405/08/01 (any digits), or null. */
function dayStart(text: string | undefined): Date | null {
  if (!text) return null;
  return parseJalaliDateTime(text.split(/\s+/)[0]!);
}

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Prisma conditions for a filter. The text search looks in every answer and
 * in staff notes, in Persian and Latin digits alike.
 */
export async function submissionWhere(
  formId: string,
  filter: SubmissionFilter,
  meId: string,
): Promise<Prisma.FormSubmissionWhereInput> {
  const where: Prisma.FormSubmissionWhereInput = { formId };
  if (filter.status) where.status = filter.status;
  if (filter.assignee === 'me') where.assigneeId = meId;
  else if (filter.assignee === 'none') where.assigneeId = null;
  else if (filter.assignee) where.assigneeId = filter.assignee;

  const from = dayStart(filter.from);
  const to = dayStart(filter.to);
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lt: new Date(to.getTime() + DAY_MS) } : {}),
    };
  }

  if (filter.q) {
    const latin = `%${escapeLike(toLatinDigits(filter.q))}%`;
    const persian = `%${escapeLike(toPersianDigits(toLatinDigits(filter.q)))}%`;
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT s.id FROM form_submissions s
      WHERE s."formId" = ${formId}
        AND (
          EXISTS (
            SELECT 1 FROM jsonb_each_text(s.data) answer
            WHERE answer.value ILIKE ${latin} OR answer.value ILIKE ${persian}
          )
          OR EXISTS (
            SELECT 1 FROM form_submission_notes note
            WHERE note."submissionId" = s.id
              AND (note.body ILIKE ${latin} OR note.body ILIKE ${persian})
          )
        )`;
    where.id = { in: rows.map((row) => row.id) };
  }
  return where;
}

export async function listSubmissions(
  formId: string,
  page: number,
  filter: SubmissionFilter = {},
  meId = '',
) {
  const where = await submissionWhere(formId, filter, meId);
  const [items, total] = await Promise.all([
    prisma.formSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * SUBMISSIONS_PAGE_SIZE,
      take: SUBMISSIONS_PAGE_SIZE,
      include: { _count: { select: { notes: true } } },
    }),
    prisma.formSubmission.count({ where }),
  ]);
  return { items, total, pageCount: Math.max(1, Math.ceil(total / SUBMISSIONS_PAGE_SIZE)) };
}

/** One submission of a form, with its notes oldest first. */
export async function getSubmissionForAdmin(formId: string, id: string) {
  return prisma.formSubmission.findFirst({
    where: { id, formId },
    include: { notes: { orderBy: { createdAt: 'asc' } } },
  });
}

/** Active staff accounts, for the assignee list and note authors. */
export async function listStaff() {
  const admins = await listAdmins();
  return admins.map(({ id, fullName, isActive }) => ({ id, fullName, isActive }));
}

/** Changes the status; false when it already had it (nothing to tell anyone). */
export async function setSubmissionStatus(id: string, status: SubmissionStatus, actorId: string) {
  const { count } = await prisma.formSubmission.updateMany({
    where: { id, status: { not: status } },
    data: { status },
  });
  if (count === 0) return false;
  await recordAudit({
    actorId,
    action: 'form.submission.status',
    entity: 'FormSubmission',
    entityId: id,
    metadata: { status },
  });
  return true;
}

export const assigneeSchema = z.union([z.literal(''), z.string().regex(/^[a-z0-9]{20,40}$/)]);

export type AssignResult = { ok: true } | { ok: false; error: string };

/** Sets (or, with null, clears) the staff member following a submission up. */
export async function assignSubmission(
  id: string,
  assigneeId: string | null,
  actorId: string,
): Promise<AssignResult> {
  if (assigneeId) {
    const staff = (await listStaff()).find((admin) => admin.id === assigneeId);
    if (!staff?.isActive) return { ok: false, error: 'این کاربر پیدا نشد یا غیرفعال است.' };
  }
  const { count } = await prisma.formSubmission.updateMany({
    where: { id },
    data: { assigneeId },
  });
  if (count === 0) return { ok: false, error: 'درخواست پیدا نشد.' };
  await recordAudit({
    actorId,
    action: 'form.submission.assign',
    entity: 'FormSubmission',
    entityId: id,
    metadata: { assigneeId },
  });
  return { ok: true };
}

export const noteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'متن یادداشت را بنویسید.')
    .max(2000, 'یادداشت حداکثر ۲۰۰۰ نویسه است.'),
});

/** Adds a staff note; false when the submission does not exist. */
export async function addSubmissionNote(id: string, body: string, actorId: string) {
  const exists = await prisma.formSubmission.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return false;
  await prisma.formSubmissionNote.create({ data: { submissionId: id, authorId: actorId, body } });
  // The text stays out of the audit log: notes may hold personal details.
  await recordAudit({
    actorId,
    action: 'form.submission.note',
    entity: 'FormSubmission',
    entityId: id,
  });
  return true;
}

const snapshotTypes = z.array(z.object({ key: z.string(), type: z.string() }));

/**
 * Who to tell about a status change: the member's own phone and email, or
 * for a submission sent without signing in, the form's first mobile and
 * email answers (staff choose to send, per change).
 */
export async function submissionContact(id: string) {
  const submission = await prisma.formSubmission.findUnique({
    where: { id },
    select: { memberId: true, data: true, fields: true, form: { select: { title: true } } },
  });
  if (!submission) return null;
  const formTitle = submission.form.title;
  if (submission.memberId) {
    const member = await getMemberContact(submission.memberId);
    if (member) return { formTitle, phone: member.phone, email: member.email };
  }
  const data = submission.data as Record<string, unknown>;
  const fields = snapshotTypes.safeParse(submission.fields).data ?? [];
  const answer = (type: string) => {
    const field = fields.find((f) => f.type === type && typeof data[f.key] === 'string');
    return field ? (data[field.key] as string) : null;
  };
  return { formTitle, phone: answer('MOBILE'), email: answer('EMAIL') };
}

/** Field types the charts count: one bar per option (or score). */
export const COUNTED_TYPES: ReadonlySet<FieldType> = new Set([
  ...CHOICE_TYPES,
  'CHECKBOX',
  'RATING',
]);

export type AnswerCount = {
  key: string;
  label: string;
  /** How many of the matching submissions answered this field. */
  answered: number;
  rows: { label: string; count: number }[];
};

/**
 * Answer counts for the form's choice, yes/no and score fields over the
 * submissions a filter matches. Options removed from the form since still
 * show up if someone chose them.
 */
export async function countAnswers(
  form: {
    id: string;
    fields: { key: string; label: string; type: FieldType; options: unknown; settings: unknown }[];
  },
  filter: SubmissionFilter,
  meId: string,
): Promise<{ total: number; fields: AnswerCount[] }> {
  const where = await submissionWhere(form.id, filter, meId);
  const submissions = await prisma.formSubmission.findMany({ where, select: { data: true } });
  const fields = form.fields
    .filter((field) => COUNTED_TYPES.has(field.type))
    .map((field) => {
      const counts = new Map<string, number>();
      if (field.type === 'CHECKBOX') {
        counts.set('بله', 0);
        counts.set('خیر', 0);
      } else if (field.type === 'RATING') {
        const scale = readSettings(field.settings).scale ?? 5;
        for (let n = 1; n <= scale; n++) counts.set(formatNumber(n), 0);
      } else {
        const options = Array.isArray(field.options) ? field.options.map(String) : [];
        for (const option of options) counts.set(option, 0);
      }
      let answered = 0;
      for (const { data } of submissions) {
        const value = (data as Record<string, unknown>)[field.key];
        const chosen =
          field.type === 'CHECKBOX'
            ? typeof value === 'boolean'
              ? [value ? 'بله' : 'خیر']
              : []
            : field.type === 'RATING'
              ? typeof value === 'number'
                ? [formatNumber(value)]
                : []
              : (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(String);
        if (chosen.length > 0) answered += 1;
        for (const label of chosen) counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      return {
        key: field.key,
        label: field.label,
        answered,
        rows: [...counts].map(([label, count]) => ({ label, count })),
      };
    });
  return { total: submissions.length, fields };
}
