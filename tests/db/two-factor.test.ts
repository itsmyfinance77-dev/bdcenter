import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/modules/auth/password';
import { base32Decode, hotp, stepAt } from '@/modules/auth/totp';
import {
  confirmTotpSetup,
  disableTotp,
  regenerateRecoveryCodes,
  resetTotpFor,
  startTotpSetup,
  twoFactorStatus,
  verifySecondFactor,
} from '@/modules/auth/two-factor';

/** Two-step login against the dev database (needs DATA_ENCRYPTION_KEY in .env). */

const EMAIL = 'test-2fa@bdcenter.test';
const OTHER = 'test-2fa-admin@bdcenter.test';
let adminId: string;
let otherId: string;

const codeAt = (secret: string, time: number) => hotp(base32Decode(secret), stepAt(time));

async function cleanup() {
  const users = await prisma.adminUser.findMany({
    where: { email: { in: [EMAIL, OTHER] } },
    select: { id: true },
  });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: users.map((u) => u.id) } } });
  await prisma.adminUser.deleteMany({ where: { email: { in: [EMAIL, OTHER] } } });
}

beforeAll(async () => {
  await cleanup();
  const passwordHash = await hashPassword('a-long-test-password');
  adminId = (await prisma.adminUser.create({ data: { fullName: 't', email: EMAIL, passwordHash } }))
    .id;
  otherId = (
    await prisma.adminUser.create({
      data: { fullName: 'o', email: OTHER, passwordHash, role: 'ADMIN' },
    })
  ).id;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('two-step login', () => {
  it('enables only after a valid code, then accepts each code once', async () => {
    const setup = await startTotpSetup(adminId);
    expect(setup?.uri).toContain('otpauth://totp/');
    expect(await twoFactorStatus(adminId)).toMatchObject({ enabled: false, setupPending: true });

    const now = Date.now();
    expect(await confirmTotpSetup(adminId, '000000', now)).toEqual({ ok: false });
    const confirmed = await confirmTotpSetup(adminId, codeAt(setup!.secret, now), now);
    if (!confirmed.ok) throw new Error('setup not confirmed');
    expect(confirmed.recoveryCodes).toHaveLength(10);
    expect(await twoFactorStatus(adminId)).toMatchObject({ enabled: true, recoveryCodesLeft: 10 });

    // The code used for setup cannot be replayed; the next step's code works once.
    expect(await verifySecondFactor(adminId, codeAt(setup!.secret, now), now)).toBeNull();
    const later = now + 30_000;
    expect(await verifySecondFactor(adminId, codeAt(setup!.secret, later), later)).toBe('totp');
    expect(await verifySecondFactor(adminId, codeAt(setup!.secret, later), later)).toBeNull();

    // A recovery code works once, in any formatting.
    const recovery = confirmed.recoveryCodes[0]!;
    expect(await verifySecondFactor(adminId, recovery.toUpperCase().replace(/-/g, ' '))).toBe(
      'recovery',
    );
    expect(await verifySecondFactor(adminId, recovery)).toBeNull();
    expect((await twoFactorStatus(adminId)).recoveryCodesLeft).toBe(9);

    // New recovery codes replace the old ones.
    const fresh = await regenerateRecoveryCodes(adminId, confirmed.recoveryCodes[1]!);
    expect(fresh).toHaveLength(10);
    expect(await verifySecondFactor(adminId, confirmed.recoveryCodes[2]!)).toBeNull();

    // Turning it off needs the password and a code.
    expect(await disableTotp(adminId, 'wrong-password', fresh![0]!)).toBe(false);
    expect(await disableTotp(adminId, 'a-long-test-password', fresh![0]!)).toBe(true);
    expect(await twoFactorStatus(adminId)).toMatchObject({ enabled: false, recoveryCodesLeft: 0 });
  });

  it('lets another ADMIN reset it, which also ends the sessions', async () => {
    const setup = await startTotpSetup(adminId);
    const now = Date.now();
    const confirmed = await confirmTotpSetup(adminId, codeAt(setup!.secret, now), now);
    expect(confirmed.ok).toBe(true);
    const before = await prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });

    expect(await resetTotpFor(adminId, { id: adminId })).toBe(false);
    expect(await resetTotpFor(adminId, { id: otherId })).toBe(true);
    const after = await prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    expect(after.totpSecret).toBeNull();
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
  });

  it('stores the secret encrypted', async () => {
    const setup = await startTotpSetup(adminId);
    const row = await prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    expect(row.totpPendingSecret).not.toContain(setup!.secret);
    expect(row.totpPendingSecret).toMatch(/^v1\./);
  });
});
