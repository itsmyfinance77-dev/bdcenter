import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  answerSurvey,
  exportSurveyAnswersCsv,
  getSurvey,
  sendSurvey,
  surveyAnswerSchema,
  surveySummary,
} from '@/modules/surveys/service';
import { createTestActor, removeTestActor } from './actor';

/**
 * Satisfaction surveys against the dev database. Rows use the `test-survey-`
 * prefix and 0988 phones; everything is removed afterwards.
 */

const PREFIX = 'test-survey-';
const ACTOR = 'test-survey-actor@bdcenter.test';
let actor: { id: string };

async function cleanup() {
  const consulting = await prisma.consultingRequest.findMany({
    where: { topic: { startsWith: PREFIX } },
    select: { id: true },
  });
  const bookings = await prisma.booking.findMany({
    where: { topic: { startsWith: PREFIX } },
    select: { id: true },
  });
  const enrollments = await prisma.enrollment.findMany({
    where: { phone: { startsWith: '0988' } },
    select: { id: true },
  });
  const ids = [...consulting, ...bookings, ...enrollments].map((row) => row.id);
  await prisma.surveyInvite.deleteMany({ where: { targetId: { in: ids } } });
  await prisma.notification.deleteMany({ where: { entityId: { in: ids } } });
  await prisma.consultingRequest.deleteMany({ where: { topic: { startsWith: PREFIX } } });
  await prisma.booking.deleteMany({ where: { topic: { startsWith: PREFIX } } });
  await prisma.appointmentSlot.deleteMany({
    where: { staff: { fullName: { startsWith: PREFIX } } },
  });
  await prisma.staffProfile.deleteMany({ where: { fullName: { startsWith: PREFIX } } });
  await prisma.course.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.sandboxSms.deleteMany({ where: { phone: { startsWith: '0988' } } });
}

beforeAll(async () => {
  actor = await createTestActor(ACTOR);
  await cleanup();
});
afterAll(async () => {
  await cleanup();
  await removeTestActor(ACTOR);
  await prisma.$disconnect();
});

async function consultingRequest(phone: string) {
  return prisma.consultingRequest.create({
    data: { fullName: 'متقاضی', phone, topic: `${PREFIX}بازاریابی`, status: 'DONE' },
  });
}

describe('satisfaction survey', () => {
  it('sends one survey per request and logs the SMS', async () => {
    const request = await consultingRequest('09880000001');
    const token = await sendSurvey('CONSULTING', request.id);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await sendSurvey('CONSULTING', request.id)).toBeNull();

    const rows = await prisma.surveyInvite.findMany({ where: { targetId: request.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'CONSULTING', smsSent: true, phone: '09880000001' });
    // Only a hash of the token is kept.
    expect(rows[0]!.tokenHash).not.toContain(token!);
    expect(
      await prisma.notification.findMany({ where: { entityId: request.id, channel: 'SMS' } }),
    ).toMatchObject([{ event: 'survey.invite', status: 'SENT' }]);
  });

  it('takes one answer per link, within its time', async () => {
    const request = await consultingRequest('09880000002');
    const token = (await sendSurvey('CONSULTING', request.id))!;
    expect(await getSurvey(token)).toMatchObject({ status: 'open' });

    const answer = surveyAnswerSchema.parse({ score: '۴', comment: ' خوب بود ' });
    expect(answer).toEqual({ score: 4, comment: 'خوب بود' });
    // Two submits at once: only one counts.
    const results = await Promise.all([answerSurvey(token, answer), answerSurvey(token, answer)]);
    expect(results.sort()).toEqual(['answered', 'saved']);
    expect(await getSurvey(token)).toEqual({ status: 'answered' });

    const late = await consultingRequest('09880000003');
    const lateToken = (await sendSurvey('CONSULTING', late.id, new Date('2020-01-01')))!;
    expect(await getSurvey(lateToken)).toEqual({ status: 'expired' });
    expect(await answerSurvey(lateToken, answer)).toBe('expired');

    expect(await getSurvey('x'.repeat(43))).toEqual({ status: 'not-found' });
    expect(await getSurvey('../../etc')).toEqual({ status: 'not-found' });
  });

  it('refuses scores outside 1 to 5', () => {
    for (const score of ['0', '6', '2.5', '', 'abc']) {
      expect(surveyAnswerSchema.safeParse({ score }).success, score).toBe(false);
    }
    // No choice at all: the same Persian message, not zod's default.
    const missing = surveyAnswerSchema.safeParse({});
    expect(missing.error?.issues[0]?.message).toBe('یک نمره از ۱ تا ۵ انتخاب کنید.');
  });

  it('groups bookings by consultant and enrollments by course, with averages', async () => {
    const staff = await prisma.staffProfile.create({
      data: { service: 'CONSULTING', fullName: `${PREFIX}مشاور`, mobile: '09880000099' },
    });
    const course = await prisma.course.create({
      data: { slug: `${PREFIX}course`, title: `${PREFIX}دوره`, status: 'PUBLISHED' },
    });
    const scores = [5, 3];
    for (const [i, score] of scores.entries()) {
      const startsAt = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000);
      const slot = await prisma.appointmentSlot.create({
        data: { staffId: staff.id, startsAt, endsAt: new Date(startsAt.getTime() + 1800_000) },
      });
      const booking = await prisma.booking.create({
        data: {
          slotId: slot.id,
          activeSlotId: slot.id,
          memberId: `m-survey-${i}`,
          fullName: 'مراجع',
          phone: `0988000010${i}`,
          topic: `${PREFIX}topic`,
          status: 'DONE',
        },
      });
      const token = (await sendSurvey('BOOKING', booking.id))!;
      expect(await answerSurvey(token, { score })).toBe('saved');
    }
    const enrollment = await prisma.enrollment.create({
      data: {
        courseId: course.id,
        memberId: 'm-survey-c',
        fullName: 'شرکت‌کننده',
        phone: '09880000200',
        status: 'DONE',
      },
    });
    await sendSurvey('COURSE', enrollment.id);

    const summary = await surveySummary();
    expect(summary.find((row) => row.groupId === staff.id)).toMatchObject({
      kind: 'BOOKING',
      groupLabel: `${PREFIX}مشاور`,
      sent: 2,
      answered: 2,
      average: 4,
    });
    expect(summary.find((row) => row.groupId === course.id)).toMatchObject({
      kind: 'COURSE',
      sent: 1,
      answered: 0,
      average: null,
    });

    const csv = await exportSurveyAnswersCsv({ groupId: staff.id }, actor.id);
    expect(csv.split('\r\n')).toHaveLength(3);
    expect(csv).toContain('09880000100');
    expect(
      await prisma.auditLog.count({ where: { actorId: actor.id, action: 'survey.export' } }),
    ).toBe(1);
  });
});
