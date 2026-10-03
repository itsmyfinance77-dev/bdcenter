import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { deleteStoredFile, storedFileSchema } from '@/modules/files/service';
import {
  getMemberForAdmin,
  profileSchema,
  reviewMember,
  saveProfile,
} from '@/modules/members/service';
import { getSetting, setSetting } from '@/modules/settings/service';

/**
 * Member identity (owner's request, 2026-10-03): profile rules, uploads and
 * the ADMIN review of legal-entity representatives. Rows use the 0993 prefix.
 */

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const png = (name: string) => new File([PNG], name, { type: 'image/png' });
const noFiles = { letter: null, nationalCard: null };

const base = {
  fullName: 'عضو آزمایشی',
  nationalId: '0499370899',
  postalCode: '8915713456',
};
const legal = profileSchema.parse({
  ...base,
  personType: 'LEGAL',
  companyName: 'شرکت آزمایشی',
  legalNationalId: '10380284790',
});

let cardSetting = false;
const startedAt = new Date();

async function cleanup() {
  const members = await prisma.member.findMany({ where: { phone: { startsWith: '0993' } } });
  for (const member of members) {
    for (const file of [member.letterFile, member.nationalCardFile]) {
      const parsed = storedFileSchema.safeParse(file);
      if (parsed.success) await deleteStoredFile(parsed.data.storageKey);
    }
  }
  await prisma.auditLog.deleteMany({
    where: { entity: 'Member', entityId: { in: members.map((m) => m.id) } },
  });
  await prisma.member.deleteMany({ where: { phone: { startsWith: '0993' } } });
}

beforeAll(async () => {
  await cleanup();
  cardSetting = await getSetting('members.nationalCardRequired');
});
afterAll(async () => {
  await cleanup();
  const admin = await prisma.adminUser.findFirst({ select: { id: true } });
  if (admin) await setSetting('members.nationalCardRequired', cardSetting, admin.id);
  // Only the setting changes this file made (the toggles below and the restore above).
  await prisma.auditLog.deleteMany({
    where: {
      entity: 'SiteSetting',
      entityId: 'members.nationalCardRequired',
      actorId: admin?.id,
      createdAt: { gte: startedAt },
    },
  });
  await prisma.$disconnect();
});

describe('member profile', () => {
  it('needs no review for an individual', async () => {
    const member = await prisma.member.create({ data: { phone: '09930000001' } });
    const input = profileSchema.parse({ ...base, personType: 'INDIVIDUAL', companyName: 'x' });
    expect(await saveProfile(member.id, input, noFiles)).toEqual({
      ok: true,
      approval: 'NOT_REQUIRED',
    });
    const saved = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(saved.companyName).toBeNull();
    expect(saved.postalCode).toBe('8915713456');
  });

  it('requires the company fields and the letter from a representative', async () => {
    const parsed = profileSchema.safeParse({ ...base, personType: 'LEGAL' });
    expect(parsed.success).toBe(false);
    const member = await prisma.member.create({ data: { phone: '09930000002' } });
    expect(await saveProfile(member.id, legal, noFiles)).toEqual({
      ok: false,
      errors: { letter: expect.any(String) },
    });
    const fake = new File([new Uint8Array([1, 2, 3, 4])], 'letter.png', { type: 'image/png' });
    const refused = await saveProfile(member.id, legal, { letter: fake, nationalCard: null });
    expect(refused.ok).toBe(false);
  });

  it('holds a representative until an ADMIN approves, and again after a change', async () => {
    const admin = await prisma.adminUser.findFirstOrThrow({ select: { id: true } });
    const member = await prisma.member.create({ data: { phone: '09930000003' } });
    expect(
      await saveProfile(member.id, legal, { letter: png('letter.png'), nationalCard: null }),
    ).toEqual({ ok: true, approval: 'PENDING' });

    expect(await reviewMember(member.id, { decision: 'APPROVED' }, admin.id)).toBe('09930000003');
    // Saving the same company details keeps the approval…
    expect(await saveProfile(member.id, legal, noFiles)).toEqual({
      ok: true,
      approval: 'APPROVED',
    });
    // …a different company sends it back for review.
    const other = { ...legal, companyName: 'شرکت دیگر' };
    expect(await saveProfile(member.id, other, noFiles)).toEqual({ ok: true, approval: 'PENDING' });

    await reviewMember(member.id, { decision: 'REJECTED', note: 'معرفی‌نامه ناخواناست' }, admin.id);
    const rejected = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(rejected.approval).toBe('REJECTED');
    expect(rejected.approvalNote).toBe('معرفی‌نامه ناخواناست');
  });

  it('lists the other representatives of the same company', async () => {
    const first = await prisma.member.findUniqueOrThrow({ where: { phone: '09930000003' } });
    const second = await prisma.member.create({ data: { phone: '09930000004' } });
    await saveProfile(second.id, legal, { letter: png('l2.png'), nationalCard: null });
    const view = await getMemberForAdmin(second.id);
    expect(view?.letter?.mimeType).toBe('image/png');
    expect(view?.colleagues.map((c) => c.id)).toEqual(
      first.legalNationalId === legal.legalNationalId ? [first.id] : [],
    );
  });

  it('asks for the national card only when an ADMIN requires it', async () => {
    const admin = await prisma.adminUser.findFirstOrThrow({ select: { id: true } });
    const member = await prisma.member.create({ data: { phone: '09930000005' } });
    const input = profileSchema.parse({ ...base, personType: 'INDIVIDUAL' });
    await setSetting('members.nationalCardRequired', true, admin.id);
    expect(await saveProfile(member.id, input, noFiles)).toEqual({
      ok: false,
      errors: { nationalCard: expect.any(String) },
    });
    expect(
      await saveProfile(member.id, input, { letter: null, nationalCard: png('card.png') }),
    ).toEqual({ ok: true, approval: 'NOT_REQUIRED' });
    await setSetting('members.nationalCardRequired', false, admin.id);
  });

  it('does not review individuals', async () => {
    const admin = await prisma.adminUser.findFirstOrThrow({ select: { id: true } });
    const member = await prisma.member.findUniqueOrThrow({ where: { phone: '09930000001' } });
    expect(await reviewMember(member.id, { decision: 'APPROVED' }, admin.id)).toBeNull();
  });
});
