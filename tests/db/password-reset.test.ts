import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/modules/auth/password';
import {
  completePasswordReset,
  requestPasswordReset,
  resetTokenValid,
} from '@/modules/auth/password-reset';

/**
 * «رمز را فراموش کرده‌ام» with the development email transport (messages go
 * to the log). Uses its own panel user `reset-test@bdcenter.test`.
 */

const EMAIL = 'reset-test@bdcenter.test';
const IP = 'test-reset-ip';
let log: string[] = [];

async function cleanup() {
  const user = await prisma.adminUser.findUnique({ where: { email: EMAIL } });
  if (user) {
    await prisma.adminPasswordReset.deleteMany({ where: { adminId: user.id } });
    await prisma.auditLog.deleteMany({ where: { actorId: user.id } });
    await prisma.adminUser.delete({ where: { id: user.id } });
  }
  await prisma.rateLimitBucket.deleteMany({
    where: {
      key: {
        in: [
          `admin-reset:email:${EMAIL}`,
          `admin-reset:ip:${IP}`,
          'admin-reset:email:nobody@bdcenter.test',
        ],
      },
    },
  });
}

function tokenFromLog(): string {
  const line = log.find((entry) => entry.includes('/admin/login/reset?token='));
  return line?.match(/token=([\w-]+)/)?.[1] ?? '';
}

beforeAll(async () => {
  await cleanup();
  await prisma.adminUser.create({
    data: { email: EMAIL, fullName: 'کاربر آزمون', passwordHash: 'unused', role: 'EDITOR' },
  });
  vi.spyOn(console, 'info').mockImplementation((line: string) => void log.push(line));
});
afterAll(async () => {
  await cleanup();
  vi.restoreAllMocks();
  await prisma.$disconnect();
});

describe('password reset by email', () => {
  it('sends a one-time link that sets a new password', async () => {
    log = [];
    expect(await requestPasswordReset(EMAIL, IP, 'http://localhost:3010')).toBe('sent');
    const token = tokenFromLog();
    expect(token.length).toBeGreaterThan(20);
    expect(await resetTokenValid(token)).toBe(true);

    expect(await completePasswordReset(token, 'a-brand-new-password')).toBe(true);
    const user = await prisma.adminUser.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(await verifyPassword(user.passwordHash, 'a-brand-new-password')).toBe(true);
    expect(user.sessionVersion).toBe(1);

    // A link works once.
    expect(await completePasswordReset(token, 'another-password-1')).toBe(false);
    expect(await resetTokenValid(token)).toBe(false);
  });

  it('answers the same for unknown addresses and sends nothing', async () => {
    log = [];
    expect(await requestPasswordReset('nobody@bdcenter.test', IP, 'http://localhost:3010')).toBe(
      'sent',
    );
    expect(tokenFromLog()).toBe('');
  });

  it('refuses expired links and limits requests', async () => {
    log = [];
    await requestPasswordReset(EMAIL, IP, 'http://localhost:3010');
    const token = tokenFromLog();
    const user = await prisma.adminUser.findUniqueOrThrow({ where: { email: EMAIL } });
    await prisma.adminPasswordReset.updateMany({
      where: { adminId: user.id, usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await completePasswordReset(token, 'too-late-password')).toBe(false);
    // Three requests per hour per address: the fourth is refused.
    expect(await requestPasswordReset(EMAIL, IP, 'http://localhost:3010')).toBe('throttled');
  });
});
