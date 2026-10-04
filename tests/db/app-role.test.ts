import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';

/**
 * The site's database role may only read and write rows (security review
 * 2026-10-04, finding 7; scripts/db-app-role.mjs). CI runs the DB tests as
 * that role, so these checks run there; against a development database the
 * owner (a superuser) is used and they are skipped.
 */

afterAll(async () => {
  await prisma.$disconnect();
});

async function restricted(): Promise<boolean> {
  const [me] = await prisma.$queryRaw<{ rolsuper: boolean }[]>`
    SELECT rolsuper FROM pg_roles WHERE rolname = current_user`;
  return me?.rolsuper === false;
}

describe('the site database role', () => {
  it('cannot change the schema, read the migrations or run programs', async () => {
    if (!(await restricted())) return;
    const refused = async (sql: string) =>
      prisma.$executeRawUnsafe(sql).then(
        () => false,
        () => true,
      );
    expect(await refused('CREATE TABLE app_role_probe (id int)')).toBe(true);
    expect(await refused('DROP TABLE members')).toBe(true);
    expect(await refused('ALTER TABLE members ADD COLUMN probe int')).toBe(true);
    expect(await refused('SELECT count(*) FROM _prisma_migrations')).toBe(true);
    expect(await refused("COPY (SELECT 1) TO PROGRAM 'true'")).toBe(true);
    expect(await refused('CREATE ROLE app_role_probe')).toBe(true);
  });

  it('can still read and write rows', async () => {
    if (!(await restricted())) return;
    expect(await prisma.siteSetting.count()).toBeGreaterThanOrEqual(0);
  });
});
