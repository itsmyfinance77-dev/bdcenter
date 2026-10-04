import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  addSubmissionNote,
  assignSubmission,
  countAnswers,
  exportSubmissionsCsv,
  formDefinitionInputSchema,
  getFormForAdmin,
  getSubmissionForAdmin,
  listSubmissions,
  parseSubmissionFilter,
  saveFormDefinition,
  setSubmissionStatus,
  submissionContact,
  submitForm,
  unreadDates,
} from '@/modules/forms/service';
import { createTestActor, removeTestActor } from './actor';

/** Staff work on submissions: filters, search, assignee, notes, charts (`test-fsub-` slugs). */

const SLUG = 'test-fsub-form';
const ACTOR = 'test-fsub-actor@bdcenter.test';
const OTHER = 'test-fsub-other@bdcenter.test';
let actor: { id: string };
let other: { id: string };
let formId: string;
const ids: string[] = [];

async function cleanup() {
  const form = await prisma.formDefinition.findUnique({ where: { slug: SLUG } });
  if (!form) return;
  await prisma.formSubmission.deleteMany({ where: { formId: form.id } });
  await prisma.formDefinition.delete({ where: { id: form.id } });
}

beforeAll(async () => {
  actor = await createTestActor(ACTOR);
  other = await createTestActor(OTHER);
  await cleanup();
  const input = formDefinitionInputSchema.parse({
    title: 'فرم پیگیری',
    slug: SLUG,
    status: 'PUBLISHED',
    fields: [
      { key: 'name', label: 'نام', type: 'TEXT', isRequired: true, options: [] },
      { key: 'mobile', label: 'همراه', type: 'MOBILE', isRequired: false, options: [] },
      {
        key: 'topic',
        label: 'زمینه',
        type: 'RADIO',
        isRequired: true,
        options: ['صادرات', 'مالی', 'بازاریابی'],
      },
      { key: 'agree', label: 'موافقت', type: 'CHECKBOX', isRequired: false, options: [] },
      {
        key: 'score',
        label: 'امتیاز',
        type: 'RATING',
        isRequired: false,
        options: [],
        settings: { scale: 3 },
      },
    ],
  });
  formId = ((await saveFormDefinition(null, input, actor.id)) as { id: string }).id;
  const answers = [
    { name: 'سارا رضایی', mobile: '09880000501', topic: 'صادرات', agree: 'on', score: '3' },
    { name: 'علی ۱۲۳', topic: 'مالی', score: '1' },
    { name: 'مینا', topic: 'صادرات' },
  ];
  for (const answer of answers) {
    const result = await submitForm(SLUG, answer);
    if (!result.ok) throw new Error('submit failed');
    ids.push(result.submissionId);
  }
});

afterAll(async () => {
  await cleanup();
  await removeTestActor(ACTOR);
  await removeTestActor(OTHER);
  await prisma.$disconnect();
});

const names = async (query: Record<string, string>) => {
  const { items } = await listSubmissions(formId, 1, parseSubmissionFilter(query), actor.id);
  return items.map((item) => (item.data as { name: string }).name).sort();
};

describe('form submissions for staff', () => {
  it('reads the filters from the address bar and drops malformed ones', () => {
    expect(
      parseSubmissionFilter({ status: 'BOGUS', assignee: "x'; drop", q: ['  رضا ', 'b'] }),
    ).toEqual({ status: undefined, assignee: undefined, q: 'رضا', from: undefined, to: undefined });
  });

  it('assigns, notes and searches answers and notes in either digit script', async () => {
    expect(await assignSubmission(ids[0]!, other.id, actor.id)).toEqual({ ok: true });
    expect(await assignSubmission(ids[1]!, actor.id, actor.id)).toEqual({ ok: true });
    expect(await assignSubmission(ids[1]!, 'c0000000000000000000000', actor.id)).toMatchObject({
      ok: false,
    });
    expect(await addSubmissionNote(ids[2]!, 'تماس گرفته شد؛ پیگیری 100%', actor.id)).toBe(true);
    expect(await addSubmissionNote('missing', 'x', actor.id)).toBe(false);

    expect(await names({ q: 'رضایی' })).toEqual(['سارا رضایی']);
    expect(await names({ q: '123' })).toEqual(['علی ۱۲۳']);
    expect(await names({ q: '۰۹۸۸۰۰۰۰۵۰۱' })).toEqual(['سارا رضایی']);
    expect(await names({ q: 'پیگیری' })).toEqual(['مینا']);
    // LIKE wildcards are plain text.
    expect(await names({ q: '%' })).toEqual(['مینا']);
    expect(await names({ assignee: 'me' })).toEqual(['علی ۱۲۳']);
    expect(await names({ assignee: 'none' })).toEqual(['مینا']);
    expect(await names({ assignee: other.id })).toEqual(['سارا رضایی']);

    const detail = await getSubmissionForAdmin(formId, ids[2]!);
    expect(detail?.notes.map((note) => note.authorId)).toEqual([actor.id]);
    expect(await getSubmissionForAdmin('another-form', ids[2]!)).toBeNull();
  });

  it('filters by status and Jalali days', async () => {
    expect(await setSubmissionStatus(ids[0]!, 'ACCEPTED', actor.id)).toBe(true);
    expect(await setSubmissionStatus(ids[0]!, 'ACCEPTED', actor.id)).toBe(false);
    expect(await names({ status: 'ACCEPTED' })).toEqual(['سارا رضایی']);
    expect(await names({ status: 'NEW' })).toHaveLength(2);
    expect(await names({ to: '1400/01/01' })).toEqual([]);
    expect(await names({ from: '1400/01/01' })).toHaveLength(3);
    expect(unreadDates({ from: '1405/13/01', to: '۱۴۰۵/۰۸/۰۱' })).toEqual(['1405/13/01']);
  });

  it('counts choice, yes/no and score answers over the filter', async () => {
    const form = (await getFormForAdmin(formId))!;
    const all = await countAnswers(form, {}, actor.id);
    expect(all.total).toBe(3);
    const byKey = Object.fromEntries(all.fields.map((field) => [field.key, field]));
    expect(byKey.topic).toMatchObject({
      answered: 3,
      rows: [
        { label: 'صادرات', count: 2 },
        { label: 'مالی', count: 1 },
        { label: 'بازاریابی', count: 0 },
      ],
    });
    expect(byKey.agree!.rows).toEqual([
      { label: 'بله', count: 1 },
      { label: 'خیر', count: 2 },
    ]);
    expect(byKey.score).toMatchObject({ answered: 2 });
    expect(byKey.score!.rows.map((row) => row.count)).toEqual([1, 0, 1]);
    expect(byKey.name).toBeUndefined();

    const accepted = await countAnswers(form, { status: 'ACCEPTED' }, actor.id);
    expect(accepted.total).toBe(1);
  });

  it('exports only what the filter matches, with the assignee', async () => {
    const csv = (await exportSubmissionsCsv(formId, actor.id, { assignee: other.id }))!;
    const lines = csv.content
      .replace(/^\uFEFF/, '')
      .trim()
      .split(/\r?\n/);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('مسئول پیگیری');
    expect(lines[1]).toContain('سارا رضایی');
  });

  it('finds whom to tell: the mobile answer of an anonymous applicant', async () => {
    expect(await submissionContact(ids[0]!)).toEqual({
      formTitle: 'فرم پیگیری',
      phone: '09880000501',
      email: null,
    });
    expect(await submissionContact(ids[1]!)).toMatchObject({ phone: null });
  });
});
