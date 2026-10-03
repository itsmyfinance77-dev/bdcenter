import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createTestActor, removeTestActor } from './actor';
import { broadcastSchema, runBroadcast, startBroadcast } from '@/modules/broadcasts/service';

/**
 * Group SMS to a course's enrollees with the development SMS provider (the
 * messages go to the log). Rows use the `test-bc-` slug and 0989 phones.
 */

const PREFIX = 'test-bc-';
let log: string[] = [];

async function cleanup() {
  const rows = await prisma.smsBroadcast.findMany({
    where: { audienceLabel: { contains: PREFIX } },
    select: { id: true },
  });
  await prisma.auditLog.deleteMany({
    where: { entity: 'SmsBroadcast', entityId: { in: rows.map((row) => row.id) } },
  });
  await prisma.smsBroadcast.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
  await prisma.course.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.sandboxSms.deleteMany({ where: { phone: { startsWith: '0989' } } });
}

const ACTOR = 'test-bc-actor@bdcenter.test';
let admin: { id: string };

beforeAll(async () => {
  admin = await createTestActor(ACTOR);
  await cleanup();
  vi.spyOn(console, 'info').mockImplementation((line: string) => void log.push(line));
});
afterAll(async () => {
  await removeTestActor(ACTOR);
  await cleanup();
  vi.restoreAllMocks();
  await prisma.$disconnect();
});

describe('group SMS', () => {
  it("texts a course's accepted enrollees once each and records the counts", async () => {
    const course = await prisma.course.create({
      data: { slug: `${PREFIX}course`, title: `${PREFIX}دوره`, status: 'PUBLISHED' },
    });
    const enroll = (memberId: string, phone: string, status: 'ACCEPTED' | 'NEW' | 'REJECTED') =>
      prisma.enrollment.create({
        data: { courseId: course.id, memberId, fullName: 'x', phone, status },
      });
    await enroll('m1', '09890000001', 'ACCEPTED');
    await enroll('m2', '09890000002', 'NEW');
    await enroll('m3', '09890000003', 'REJECTED');

    const input = broadcastSchema.parse({
      audience: 'course',
      courseId: course.id,
      scope: 'accepted',
      text: 'جلسهٔ فردا لغو شد.',
    });
    const started = await startBroadcast(input, admin.id);
    expect(started).toMatchObject({ ok: true, recipients: 1, phones: ['09890000001'] });
    if (!started.ok) return;

    log = [];
    await runBroadcast(started.id, started.phones, input.text);
    expect(log.filter((line) => line.includes('جلسهٔ فردا لغو شد'))).toHaveLength(1);
    const row = await prisma.smsBroadcast.findUniqueOrThrow({ where: { id: started.id } });
    expect(row).toMatchObject({ recipients: 1, sent: 1, failed: 0 });
    expect(row.finishedAt).not.toBeNull();

    const all = await startBroadcast({ ...input, scope: 'all' }, admin.id);
    expect(all).toMatchObject({ ok: true, recipients: 2 });
  });

  it('refuses an empty audience and a missing course', async () => {
    expect(broadcastSchema.safeParse({ audience: 'course', text: 'x' }).success).toBe(false);
    const empty = await prisma.course.create({
      data: { slug: `${PREFIX}empty`, title: `${PREFIX}خالی`, status: 'PUBLISHED' },
    });
    expect(
      await startBroadcast(
        broadcastSchema.parse({ audience: 'course', courseId: empty.id, text: 'x' }),
        admin.id,
      ),
    ).toMatchObject({ ok: false });
  });
});
