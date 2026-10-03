import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { clear, consume, isExhausted } from '@/modules/ratelimit/service';
import { enroll } from '@/modules/training/service';

/** A member as the pages pass it in; the profile rule is covered by tests/members-access.test.ts. */
async function createMember(args: Parameters<typeof prisma.member.create>[0]) {
  const row = await prisma.member.create(args);
  return { ...row, access: row.fullName ? ('ok' as const) : ('incomplete' as const) };
}

/**
 * Integration tests against the dev database (`npm run test:db`). Every row
 * they create uses a `test-` prefix and is removed afterwards.
 */

const PREFIX = 'test-train-';

async function cleanup() {
  await prisma.course.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.member.deleteMany({ where: { phone: { startsWith: '0999' } } });
  await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: PREFIX } } });
}

beforeAll(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('rate limiting', () => {
  it('allows exactly `max` hits, even when they arrive at once', async () => {
    const key = `${PREFIX}burst`;
    const results = await Promise.all(
      Array.from({ length: 20 }, () => consume(key, { max: 3, windowSeconds: 60 })),
    );
    expect(results.filter(Boolean)).toHaveLength(3);
    expect(await isExhausted(key, { max: 3, windowSeconds: 60 })).toBe(true);
    await clear(key);
    expect(await isExhausted(key, { max: 3, windowSeconds: 60 })).toBe(false);
  });

  it('starts a new window once the old one has passed', async () => {
    const key = `${PREFIX}window`;
    const limit = { max: 1, windowSeconds: 1 };
    expect(await consume(key, limit)).toBe(true);
    expect(await consume(key, limit)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(await consume(key, limit)).toBe(true);
  });
});

describe('enrollment', () => {
  it('never gives out more seats than the capacity', async () => {
    await prisma.course.create({
      data: { slug: `${PREFIX}race`, title: 'race', status: 'PUBLISHED', capacity: 3 },
    });
    const members = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        createMember({
          data: { phone: `099900000${String(i).padStart(2, '0')}`, fullName: `m${i}` },
        }),
      ),
    );
    const results = await Promise.all(members.map((member) => enroll(`${PREFIX}race`, member)));
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect(results.filter((r) => !r.ok && r.reason === 'full')).toHaveLength(7);
  });

  it('refuses a second enrollment and one without a name', async () => {
    await prisma.course.create({
      data: { slug: `${PREFIX}dup`, title: 'dup', status: 'PUBLISHED' },
    });
    const member = await createMember({ data: { phone: '09990000100', fullName: 'x' } });
    expect(await enroll(`${PREFIX}dup`, member)).toEqual({ ok: true });
    expect(await enroll(`${PREFIX}dup`, member)).toEqual({ ok: false, reason: 'duplicate' });

    const nameless = await createMember({ data: { phone: '09990000101' } });
    expect(await enroll(`${PREFIX}dup`, nameless)).toEqual({ ok: false, reason: 'profile' });
  });

  it('refuses draft, closed and started courses', async () => {
    const member = await createMember({ data: { phone: '09990000102', fullName: 'y' } });
    await prisma.course.createMany({
      data: [
        { slug: `${PREFIX}draft`, title: 'd', status: 'DRAFT' },
        { slug: `${PREFIX}closed`, title: 'c', status: 'PUBLISHED', enrollmentOpen: false },
        {
          slug: `${PREFIX}started`,
          title: 's',
          status: 'PUBLISHED',
          startsAt: new Date(Date.now() - 60_000),
        },
      ],
    });
    expect(await enroll(`${PREFIX}draft`, member)).toEqual({ ok: false, reason: 'not-found' });
    expect(await enroll(`${PREFIX}closed`, member)).toEqual({ ok: false, reason: 'closed' });
    expect(await enroll(`${PREFIX}started`, member)).toEqual({ ok: false, reason: 'started' });
  });
});
