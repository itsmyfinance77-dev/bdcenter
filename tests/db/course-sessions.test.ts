import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { parseSessions } from '@/modules/training/sessions';
import { courseInputSchema, deleteCourse, saveCourse } from '@/modules/training/service';
import { createTestActor, removeTestActor } from './actor';

/** Courses with several sessions (`test-sessions-` slugs). */

const PREFIX = 'test-sessions-';
const ACTOR = 'test-sessions-actor@bdcenter.test';
let actor: { id: string };

beforeAll(async () => {
  actor = await createTestActor(ACTOR);
  await prisma.course.deleteMany({ where: { slug: { startsWith: PREFIX } } });
});
afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await removeTestActor(ACTOR);
  await prisma.$disconnect();
});

const input = courseInputSchema.parse({
  title: 'دوره چندجلسه‌ای',
  slug: `${PREFIX}course`,
  status: 'PUBLISHED',
});

describe('course sessions', () => {
  it('stores the sessions and takes the course start and end from them', async () => {
    const { sessions } = parseSessions({
      s0date: '1406/02/17',
      s0start: '16:00',
      s0end: '18:00',
      s1date: '1406/02/10',
      s1start: '16:00',
      s1topic: 'آشنایی',
    });
    const result = await saveCourse(null, input, sessions, actor.id);
    expect(result.ok).toBe(true);
    const id = (result as { id: string }).id;
    const course = await prisma.course.findUniqueOrThrow({
      where: { id },
      include: { sessions: { orderBy: { startsAt: 'asc' } } },
    });
    expect(course.sessions).toHaveLength(2);
    expect(course.sessions[0]).toMatchObject({ topic: 'آشنایی', endsAt: null });
    expect(course.startsAt).toEqual(sessions[0]!.startsAt);
    expect(course.endsAt).toEqual(sessions[1]!.endsAt);

    // Saving again replaces the list; without sessions the course has no dates.
    await saveCourse(id, input, sessions.slice(1), actor.id);
    expect(await prisma.courseSession.count({ where: { courseId: id } })).toBe(1);
    await saveCourse(id, input, [], actor.id);
    expect(await prisma.course.findUniqueOrThrow({ where: { id } })).toMatchObject({
      startsAt: null,
      endsAt: null,
    });

    await saveCourse(id, input, sessions, actor.id);
    await deleteCourse(id, actor.id);
    expect(await prisma.courseSession.count({ where: { courseId: id } })).toBe(0);
  });

  it('notes in the audit log a legacy end that a save drops', async () => {
    const { sessions } = parseSessions({ s0date: '1406/03/01', s0start: '10:00', s0end: '12:00' });
    const result = await saveCourse(
      null,
      { ...input, slug: `${PREFIX}legacy` },
      sessions,
      actor.id,
    );
    const id = (result as { id: string }).id;
    // A course from before sessions: its end was on a later day.
    const legacyEnd = new Date('2027-06-01T08:30:00Z');
    await prisma.course.update({ where: { id }, data: { endsAt: legacyEnd } });

    await saveCourse(id, { ...input, slug: `${PREFIX}legacy` }, sessions, actor.id);
    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { entity: 'Course', entityId: id, action: 'course.update' },
      orderBy: { createdAt: 'desc' },
    });
    expect(entry.metadata).toMatchObject({ droppedEnd: legacyEnd.toISOString() });

    // Nothing left to drop on the next save.
    await saveCourse(id, { ...input, slug: `${PREFIX}legacy` }, sessions, actor.id);
    const next = await prisma.auditLog.findFirstOrThrow({
      where: { entity: 'Course', entityId: id, action: 'course.update' },
      orderBy: { createdAt: 'desc' },
    });
    expect(next.metadata).not.toHaveProperty('droppedEnd');
    await deleteCourse(id, actor.id);
  });
});
