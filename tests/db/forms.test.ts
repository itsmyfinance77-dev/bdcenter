import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  exportSubmissionsCsv,
  formDefinitionInputSchema,
  getFormForAdmin,
  saveFormDefinition,
  submissionFields,
  submitForm,
} from '@/modules/forms/service';
import { createTestActor, removeTestActor } from './actor';

/** The form builder's field types end to end (`test-forms-` slugs). */

const SLUG = 'test-forms-apply';
const ACTOR = 'test-forms-actor@bdcenter.test';
let actor: { id: string };

async function cleanup() {
  const form = await prisma.formDefinition.findUnique({ where: { slug: SLUG } });
  if (!form) return;
  await prisma.formSubmission.deleteMany({ where: { formId: form.id } });
  await prisma.formDefinition.delete({ where: { id: form.id } });
}

beforeAll(async () => {
  actor = await createTestActor(ACTOR);
  await cleanup();
});
afterAll(async () => {
  await cleanup();
  await removeTestActor(ACTOR);
  await prisma.$disconnect();
});

const definition = (fields: unknown[]) =>
  formDefinitionInputSchema.parse({
    title: 'درخواست آزمایشی',
    slug: SLUG,
    description: '<p>توضیح <strong>پررنگ</strong></p><script>alert(1)</script>',
    status: 'PUBLISHED',
    fields,
  });

const base = [
  {
    key: 'intro',
    label: 'مشخصات شما',
    type: 'SECTION',
    isRequired: true,
    options: [],
    settings: { hint: 'لطفاً دقیق بنویسید.' },
  },
  {
    key: 'name',
    label: 'نام',
    type: 'TEXT',
    isRequired: true,
    options: [],
    settings: { minLength: 2 },
  },
  { key: 'code', label: 'کد ملی', type: 'NATIONAL_CODE', isRequired: true, options: [] },
  {
    key: 'topics',
    label: 'زمینه‌ها',
    type: 'MULTI_CHOICE',
    isRequired: true,
    options: ['صادرات', 'بازاریابی', 'مالی'],
  },
  { key: 'when', label: 'تاریخ مراجعه', type: 'JALALI_DATE', isRequired: false, options: [] },
  {
    key: 'score',
    label: 'امتیاز',
    type: 'RATING',
    isRequired: false,
    options: [],
    settings: { scale: 5 },
  },
];

describe('form builder', () => {
  it('saves the new field types, takes answers and keeps old submissions readable', async () => {
    const saved = await saveFormDefinition(null, definition(base), actor.id);
    expect(saved.ok).toBe(true);
    const id = (saved as { id: string }).id;
    const form = await getFormForAdmin(id);
    expect(form?.descriptionHtml).toContain('<strong>پررنگ</strong>');
    expect(form?.descriptionHtml).not.toContain('script');
    // A heading is never required.
    expect(form?.fields.find((f) => f.key === 'intro')?.isRequired).toBe(false);

    const invalid = await submitForm(SLUG, { name: 'س', code: '123', topics: [] });
    expect(invalid).toMatchObject({ ok: false, reason: 'invalid' });
    expect(Object.keys((invalid as { errors: object }).errors).sort()).toEqual([
      'code',
      'name',
      'topics',
    ]);

    const ok = await submitForm(SLUG, {
      name: 'سارا',
      code: '۰۴۹۹۳۷۰۸۹۹',
      topics: ['صادرات', 'مالی'],
      when: '۱۴۰۵/۸/۱',
      score: '4',
      intro: 'ignored',
    });
    expect(ok).toEqual({ ok: true, formTitle: 'درخواست آزمایشی' });
    const submission = await prisma.formSubmission.findFirstOrThrow({ where: { formId: id } });
    expect(submission.data).toEqual({
      name: 'سارا',
      code: '0499370899',
      topics: ['صادرات', 'مالی'],
      when: '1405/08/01',
      score: 4,
    });

    // The form changes: «نام» is renamed, «امتیاز» removed.
    const changed = base
      .filter((f) => f.key !== 'score')
      .map((f) => (f.key === 'name' ? { ...f, label: 'نام و نام خانوادگی' } : f));
    await saveFormDefinition(id, definition(changed), actor.id);
    const current = (await getFormForAdmin(id))!.fields;
    const shown = submissionFields(submission, current);
    expect(shown.map((f) => f.label)).toEqual([
      'نام',
      'کد ملی',
      'زمینه‌ها',
      'تاریخ مراجعه',
      'امتیاز',
    ]);

    const csv = (await exportSubmissionsCsv(id, actor.id))!.content;
    const [header, row] = csv.replace(String.fromCharCode(0xfeff), '').split('\r\n');
    expect(header).toContain('"نام و نام خانوادگی"');
    expect(header).toContain('"امتیاز"');
    expect(row).toContain('"صادرات، مالی"');
    expect(row).toContain('"۴ از ۵"');
  });
});
