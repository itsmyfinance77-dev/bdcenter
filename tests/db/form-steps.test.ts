import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { formDefinitionInputSchema, saveFormDefinition, submitForm } from '@/modules/forms/service';
import { createTestActor, removeTestActor } from './actor';

/** Conditional fields and multi-step forms on the server (`test-fstep-` slugs). */

const SLUG = 'test-fstep-form';
const ACTOR = 'test-fstep-actor@bdcenter.test';
let actor: { id: string };

async function cleanup() {
  const form = await prisma.formDefinition.findUnique({ where: { slug: SLUG } });
  if (!form) return;
  await prisma.formSubmission.deleteMany({ where: { formId: form.id } });
  await prisma.formDefinition.delete({ where: { id: form.id } });
}

const fields = [
  {
    key: 'kind',
    label: 'نوع',
    type: 'RADIO',
    isRequired: true,
    options: ['حقیقی', 'حقوقی'],
  },
  {
    key: 'docs',
    label: 'مدارک',
    type: 'SECTION',
    isRequired: false,
    options: [],
    settings: { newPage: true },
  },
  {
    key: 'company',
    label: 'نام شرکت',
    type: 'TEXT',
    isRequired: true,
    options: [],
    settings: { showIf: { field: 'kind', value: 'حقوقی' } },
  },
  { key: 'note', label: 'توضیح', type: 'TEXTAREA', isRequired: false, options: [] },
];

beforeAll(async () => {
  actor = await createTestActor(ACTOR);
  await cleanup();
  await saveFormDefinition(
    null,
    formDefinitionInputSchema.parse({
      title: 'فرم مرحله‌ای',
      slug: SLUG,
      status: 'PUBLISHED',
      fields,
    }),
    actor.id,
  );
});

afterAll(async () => {
  await cleanup();
  await removeTestActor(ACTOR);
  await prisma.$disconnect();
});

describe('conditional fields and steps', () => {
  it('refuses a condition that does not look back at a choice field', () => {
    const issues = (list: unknown[]) => {
      const result = formDefinitionInputSchema.safeParse({
        title: 't',
        slug: 'test-fstep-x',
        status: 'DRAFT',
        fields: list,
      });
      return result.success ? [] : result.error.issues.map((issue) => issue.message);
    };
    expect(issues(fields)).toEqual([]);
    // The controller comes after the field it controls.
    expect(issues([fields[2], fields[0]])[0]).toContain('«نام شرکت»');
    expect(
      issues([fields[0], { ...fields[2], settings: { showIf: { field: 'kind', value: 'سوم' } } }]),
    ).toHaveLength(1);
    expect(issues([{ ...fields[3], settings: { newPage: true } }])).toHaveLength(1);
  });

  it('requires and keeps a shown field, ignores and drops a hidden one', async () => {
    expect(await submitForm(SLUG, { kind: 'حقوقی', note: 'x' })).toMatchObject({
      ok: false,
      reason: 'invalid',
      errors: { company: expect.any(String) },
    });

    const legal = await submitForm(SLUG, { kind: 'حقوقی', company: 'شرکت نمونه' });
    const person = await submitForm(SLUG, { kind: 'حقیقی', company: 'نباید بماند' });
    expect(legal.ok && person.ok).toBe(true);
    const stored = await prisma.formSubmission.findMany({
      where: { form: { slug: SLUG } },
      orderBy: { createdAt: 'asc' },
      select: { data: true },
    });
    expect(stored.map((row) => row.data)).toEqual([
      { kind: 'حقوقی', company: 'شرکت نمونه' },
      { kind: 'حقیقی' },
    ]);
  });
});
