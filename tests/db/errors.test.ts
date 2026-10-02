import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { recordServerError, setErrorResolved } from '@/modules/errors/service';
import { clear } from '@/modules/ratelimit/service';

/** Error grouping and alerts; rows use routes under /test-errors and a test admin. */

const ROUTE = '/test-errors/[slug]';
const ADMIN_EMAIL = 'test-errors-admin@bdcenter.test';
let adminId: string;

async function cleanup() {
  await prisma.errorGroup.deleteMany({ where: { route: { startsWith: '/test-errors' } } });
  await prisma.auditLog.deleteMany({ where: { actor: { email: ADMIN_EMAIL } } });
  await prisma.adminUser.deleteMany({ where: { email: ADMIN_EMAIL } });
  await clear('error-alert');
}

beforeAll(async () => {
  await cleanup();
  const admin = await prisma.adminUser.create({
    data: { email: ADMIN_EMAIL, fullName: 'آزمون خطا', passwordHash: 'x', role: 'ADMIN' },
  });
  adminId = admin.id;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

// Development mode with no SMTP_URL: emails are "sent" to the console.
const env = {
  NODE_ENV: 'development',
  ERROR_ALERT_EMAIL: 'ops@bdcenter.test',
  NEXT_PUBLIC_SITE_URL: 'https://bdcenter.test',
};

describe('error reporting', () => {
  it('groups concurrent repeats into one row, alerting once', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        recordServerError(
          new TypeError(`Cannot read properties of undefined (reading 'x') at item ${i}`),
          {
            route: ROUTE,
            path: `/test-errors/a-${i}?token=secret`,
            method: 'GET',
            routeType: 'render',
          },
          env,
        ),
      ),
    );

    const rows = await prisma.errorGroup.findMany({ where: { route: ROUTE } });
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.count).toBe(10);
    expect(row.lastPath).toMatch(/^\/test-errors\/a-\d$/);
    expect(results.filter((r) => r?.alerted)).toHaveLength(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining(`/admin/system/errors/${row.id}`));
    log.mockRestore();
  });

  it('reopens a resolved error on its next occurrence and alerts again', async () => {
    const row = await prisma.errorGroup.findFirstOrThrow({ where: { route: ROUTE } });
    await setErrorResolved(row.id, true, adminId);
    expect(
      (await prisma.errorGroup.findUniqueOrThrow({ where: { id: row.id } })).resolvedAt,
    ).not.toBeNull();
    expect(
      await prisma.auditLog.count({ where: { actorId: adminId, action: 'error.resolve' } }),
    ).toBe(1);

    const quiet = vi.spyOn(console, 'info').mockImplementation(() => {});
    const again = await recordServerError(
      new TypeError("Cannot read properties of undefined (reading 'y') at item 99"),
      { route: ROUTE },
      env,
    );
    const onceMore = await recordServerError(
      new TypeError("Cannot read properties of undefined (reading 'z') at item 1"),
      { route: ROUTE },
      env,
    );
    quiet.mockRestore();

    expect(again).toMatchObject({ id: row.id, count: 11, alerted: true });
    expect(onceMore).toMatchObject({ count: 12, alerted: false });
    expect(
      (await prisma.errorGroup.findUniqueOrThrow({ where: { id: row.id } })).resolvedAt,
    ).toBeNull();
  });

  it('caps alert emails per hour and skips Next.js control flow', async () => {
    await clear('error-alert');
    const quiet = vi.spyOn(console, 'info').mockImplementation(() => {});
    const results = [];
    for (let i = 0; i < 12; i++) {
      results.push(
        await recordServerError(
          new Error(`distinct failure ${'abcdefghijkl'[i]}`),
          { route: `/test-errors/cap-${'abcdefghijkl'[i]}` },
          env,
        ),
      );
    }
    quiet.mockRestore();
    expect(results.filter((r) => r?.alerted)).toHaveLength(10);

    const redirect = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;push;/x;307;',
    });
    expect(await recordServerError(redirect, { route: '/test-errors/redirect' }, env)).toBeNull();
    expect(await prisma.errorGroup.count({ where: { route: '/test-errors/redirect' } })).toBe(0);
  });
});
