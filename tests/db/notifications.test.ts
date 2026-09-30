import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createConsultingRequest } from '@/modules/consulting/service';
import {
  listNotifications,
  notifyConsultingStatus,
  notifyEnrollmentStatus,
} from '@/modules/notifications/service';

/**
 * Status notifications with the development `console` SMS provider and no
 * SMTP server (messages go to the log). Rows use the `test-` / 0997 prefixes.
 */

const PREFIX = 'test-notify-';

async function cleanup() {
  const enrollments = await prisma.enrollment.findMany({
    where: { phone: { startsWith: '0997' } },
    select: { id: true },
  });
  const requests = await prisma.consultingRequest.findMany({
    where: { topic: { startsWith: PREFIX } },
    select: { id: true },
  });
  await prisma.notification.deleteMany({
    where: { entityId: { in: [...enrollments, ...requests].map((row) => row.id) } },
  });
  await prisma.course.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.consultingRequest.deleteMany({ where: { topic: { startsWith: PREFIX } } });
}

let log: string[] = [];

beforeAll(async () => {
  await cleanup();
  vi.spyOn(console, 'info').mockImplementation((line: string) => void log.push(line));
});
afterAll(async () => {
  await cleanup();
  vi.restoreAllMocks();
  await prisma.$disconnect();
});

describe('status notifications', () => {
  it('sends SMS and email for an accepted enrollment and logs both', async () => {
    const course = await prisma.course.create({
      data: { slug: `${PREFIX}course`, title: 'دوره آزمایشی', status: 'PUBLISHED' },
    });
    const enrollment = await prisma.enrollment.create({
      data: {
        courseId: course.id,
        memberId: 'm1',
        fullName: 'x',
        phone: '09970000001',
        email: 'x@bdcenter.test',
      },
    });
    log = [];
    await notifyEnrollmentStatus(enrollment.id, 'ACCEPTED');

    expect(log.some((line) => line.includes('09970000001') && line.includes('پذیرفته شد'))).toBe(
      true,
    );
    expect(log.some((line) => line.includes('x@bdcenter.test'))).toBe(true);
    const rows = (await listNotifications('Enrollment', [enrollment.id]))[enrollment.id];
    expect(rows?.map((row) => [row.channel, row.status, row.event]).sort()).toEqual([
      ['EMAIL', 'SENT', 'status.ACCEPTED'],
      ['SMS', 'SENT', 'status.ACCEPTED'],
    ]);
  });

  it('sends nothing for statuses without a message', async () => {
    const course = await prisma.course.findUniqueOrThrow({ where: { slug: `${PREFIX}course` } });
    const enrollment = await prisma.enrollment.create({
      data: { courseId: course.id, memberId: 'm2', fullName: 'y', phone: '09970000002' },
    });
    await notifyEnrollmentStatus(enrollment.id, 'IN_REVIEW');
    await notifyEnrollmentStatus(enrollment.id, 'NEW');
    expect(await listNotifications('Enrollment', [enrollment.id])).toEqual({});
  });

  it('skips SMS for a landline and still emails', async () => {
    const { id } = await createConsultingRequest({
      fullName: 'z',
      phone: '03591091050',
      email: 'z@bdcenter.test',
      topic: `${PREFIX}topic`,
      nationalId: undefined,
      companyName: undefined,
      description: undefined,
    });
    await notifyConsultingStatus(id, 'REJECTED');
    const rows = (await listNotifications('ConsultingRequest', [id]))[id];
    expect(rows?.map((row) => row.channel)).toEqual(['EMAIL']);
  });
});
