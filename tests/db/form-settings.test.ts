import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  duplicateForm,
  formDefinitionInputSchema,
  getPublishedForm,
  prefillValues,
  saveFormDefinition,
  submitForm,
} from '@/modules/forms/service';
import { createTestActor, removeTestActor } from './actor';

/** Form settings: dates, limits, members-only, confirmation, copying (`test-fset-` slugs). */

const PREFIX = 'test-fset-';
const ACTOR = 'test-fset-actor@bdcenter.test';
let actor: { id: string };

async function cleanup() {
  const forms = await prisma.formDefinition.findMany({
    where: { slug: { startsWith: PREFIX } },
    select: { id: true },
  });
  const ids = forms.map((form) => form.id);
  await prisma.formSubmission.deleteMany({ where: { formId: { in: ids } } });
  await prisma.formDefinition.deleteMany({ where: { id: { in: ids } } });
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

const fields = [
  {
    key: 'name',
    label: 'نام',
    type: 'TEXT',
    isRequired: true,
    options: [],
    settings: { prefill: 'fullName' },
  },
  { key: 'mobile', label: 'همراه', type: 'MOBILE', isRequired: true, options: [] },
];

async function form(slug: string, settings: Record<string, unknown>) {
  const input = formDefinitionInputSchema.parse({
    title: 'فرم تنظیمات',
    slug: `${PREFIX}${slug}`,
    status: 'PUBLISHED',
    fields,
    ...settings,
  });
  const saved = await saveFormDefinition(null, input, actor.id);
  return (saved as { id: string }).id;
}

const answer = { name: 'سارا', mobile: '09880000301' };
const member = (n: number) => ({ id: `m-fset-${n}`, phone: `0988000040${n}`, email: null });

describe('form settings', () => {
  it('validates the settings in the builder', () => {
    const base = { title: 't', slug: `${PREFIX}x`, status: 'DRAFT', fields };
    const errors = (extra: Record<string, unknown>) => {
      const result = formDefinitionInputSchema.safeParse({ ...base, ...extra });
      return result.success ? [] : result.error.issues.map((issue) => issue.path[0]);
    };
    expect(errors({ opensAt: '1405/08/10 08:00', closesAt: '1405/08/01 08:00' })).toEqual([
      'closesAt',
    ]);
    expect(errors({ onePerMember: 'on' })).toEqual(['onePerMember']);
    expect(errors({ maxSubmissions: '۰' })).toEqual(['maxSubmissions']);
    expect(errors({ alertRecipients: 'نه-شماره' })).toEqual(['alertRecipients']);
    expect(errors({ maxSubmissions: '۱۰', alertRecipients: '09121234567\na@b.ir' })).toEqual([]);
  });

  it('takes answers only inside its dates', async () => {
    await form('window', { opensAt: '1405/08/01 08:00', closesAt: '1405/08/10 08:00' });
    const slug = `${PREFIX}window`;
    // 1405/07/30 and 1405/08/10 08:00 Tehran.
    expect(await submitForm(slug, answer, null, new Date('2026-10-22T04:30:00Z'))).toMatchObject({
      ok: false,
      reason: 'not-yet',
    });
    expect(await submitForm(slug, answer, null, new Date('2026-11-01T04:30:00Z'))).toMatchObject({
      ok: false,
      reason: 'closed',
    });
    expect(await submitForm(slug, answer, null, new Date('2026-10-25T08:00:00Z'))).toMatchObject({
      ok: true,
    });
  });

  it('never goes over its limit, even when two people send at once', async () => {
    const id = await form('limit', { maxSubmissions: '1', thankYouText: 'سپاس از شما' });
    const slug = `${PREFIX}limit`;
    const results = await Promise.all([submitForm(slug, answer), submitForm(slug, answer)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ reason: 'full' });
    expect(results.find((r) => r.ok)).toMatchObject({ thankYouText: 'سپاس از شما' });
    expect(await prisma.formSubmission.count({ where: { formId: id } })).toBe(1);
  });

  it('is for signed-in members only, once each, and fills in from the profile', async () => {
    await form('members', {
      membersOnly: 'on',
      onePerMember: 'on',
      confirmToApplicant: 'on',
      alertRecipients: '09880000999',
    });
    const slug = `${PREFIX}members`;
    expect(await submitForm(slug, answer, null)).toMatchObject({ ok: false, reason: 'sign-in' });
    const first = await submitForm(slug, answer, member(1));
    expect(first).toMatchObject({
      ok: true,
      // The member's own number, not the one typed in the form.
      confirmTo: { phone: '09880000401', email: null },
      alertRecipients: { phones: ['09880000999'], emails: [] },
    });
    expect(await submitForm(slug, answer, member(1))).toMatchObject({
      ok: false,
      reason: 'already',
    });
    expect(await submitForm(slug, answer, member(2))).toMatchObject({ ok: true });

    const published = (await getPublishedForm(slug))!;
    expect(prefillValues(published, { fullName: 'سارا آزمون', phone: '0912' })).toEqual({
      name: 'سارا آزمون',
    });
  });

  it('confirms to the form’s own mobile answer when it is not members-only', async () => {
    await form('confirm', { confirmToApplicant: 'on' });
    expect(await submitForm(`${PREFIX}confirm`, answer)).toMatchObject({
      ok: true,
      confirmTo: { phone: '09880000301' },
      alertRecipients: null,
    });
  });

  it('copies a form as a draft with its fields and settings', async () => {
    const id = await form('copy', { membersOnly: 'on', maxSubmissions: '5' });
    const copyId = (await duplicateForm(id, actor.id))!;
    const secondId = (await duplicateForm(id, actor.id))!;
    const copy = await prisma.formDefinition.findUniqueOrThrow({
      where: { id: copyId },
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
    });
    expect(copy).toMatchObject({
      slug: `${PREFIX}copy-copy`,
      status: 'DRAFT',
      membersOnly: true,
      maxSubmissions: 5,
    });
    expect(copy.title).toContain('(کپی)');
    expect(copy.fields.map((f) => f.key)).toEqual(['name', 'mobile']);
    expect(copy.fields[0]!.settings).toEqual({ prefill: 'fullName' });
    expect((await prisma.formDefinition.findUniqueOrThrow({ where: { id: secondId } })).slug).toBe(
      `${PREFIX}copy-copy-2`,
    );
  });
});
