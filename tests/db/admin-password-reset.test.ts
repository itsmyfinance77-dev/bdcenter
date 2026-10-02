import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/modules/auth/password';
import {
  adminLoginEmailKey,
  changeOwnPassword,
  createAdmin,
  generatePassword,
  resetAdminPassword,
} from '@/modules/auth/users';
import { consume, isExhausted, LIMITS } from '@/modules/ratelimit/service';

/** Password reset by an ADMIN; accounts use the test-pwreset- email prefix. */

const PREFIX = 'test-pwreset-';
let adminId: string;
let userId: string;
const userEmail = `${PREFIX}user@bdcenter.test`;

async function cleanup() {
  const users = await prisma.adminUser.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true, email: true },
  });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: users.map((u) => u.id) } } });
  await prisma.adminUser.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await prisma.rateLimitBucket.deleteMany({
    where: { key: { in: users.map((u) => adminLoginEmailKey(u.email)) } },
  });
}

beforeAll(async () => {
  await cleanup();
  adminId = (
    await prisma.adminUser.create({
      data: {
        email: `${PREFIX}admin@bdcenter.test`,
        fullName: 'مدیر',
        passwordHash: 'x',
        role: 'ADMIN',
      },
    })
  ).id;
  const created = await createAdmin(
    { email: userEmail, fullName: 'کاربر', role: 'EDITOR', password: 'initial-password-123' },
    adminId,
  );
  expect(created.ok).toBe(true);
  userId = (await prisma.adminUser.findUniqueOrThrow({ where: { email: userEmail } })).id;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('admin password reset', () => {
  it('asks a user whose password someone else chose to change it', async () => {
    const user = await prisma.adminUser.findUniqueOrThrow({ where: { id: userId } });
    expect(user.mustChangePassword).toBe(true);
  });

  it('generates a strong one-time password, ends sessions and lifts a lockout', async () => {
    // Lock the account out with failed logins first.
    for (let i = 0; i <= LIMITS.adminLogin.max; i++) {
      await consume(adminLoginEmailKey(userEmail), LIMITS.adminLogin);
    }
    expect(await isExhausted(adminLoginEmailKey(userEmail), LIMITS.adminLogin)).toBe(true);
    const before = await prisma.adminUser.findUniqueOrThrow({ where: { id: userId } });

    const result = await resetAdminPassword(userId, '', { id: adminId });
    if (!result.ok || !result.generated) throw new Error('expected a generated password');
    expect(result.generated).toMatch(/^[a-zA-Z2-9]{4}(-[a-zA-Z2-9]{4}){3}$/);

    const after = await prisma.adminUser.findUniqueOrThrow({ where: { id: userId } });
    expect(await verifyPassword(after.passwordHash, result.generated)).toBe(true);
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
    expect(after.mustChangePassword).toBe(true);
    expect(await isExhausted(adminLoginEmailKey(userEmail), LIMITS.adminLogin)).toBe(false);
    expect(
      await prisma.auditLog.count({
        where: { actorId: adminId, action: 'admin.password.reset', entityId: userId },
      }),
    ).toBe(1);
  });

  it('accepts a typed password, and the user then replaces it', async () => {
    const result = await resetAdminPassword(userId, 'typed-by-admin-2026', { id: adminId });
    expect(result).toEqual({ ok: true, generated: null });

    const changed = await changeOwnPassword(
      { id: userId },
      'typed-by-admin-2026',
      'my-own-secret-pass',
    );
    expect(changed.ok).toBe(true);
    const user = await prisma.adminUser.findUniqueOrThrow({ where: { id: userId } });
    expect(user.mustChangePassword).toBe(false);
    expect(await verifyPassword(user.passwordHash, 'my-own-secret-pass')).toBe(true);
  });

  it('refuses to reset your own password or an unknown user', async () => {
    expect(await resetAdminPassword(adminId, '', { id: adminId })).toMatchObject({ ok: false });
    expect(await resetAdminPassword('no-such-user', '', { id: adminId })).toMatchObject({
      ok: false,
    });
  });

  it('generates distinct passwords from the unambiguous alphabet', () => {
    const all = new Set(Array.from({ length: 100 }, generatePassword));
    expect(all.size).toBe(100);
    for (const password of all) expect(password).not.toMatch(/[01ilIoO]/);
  });
});
