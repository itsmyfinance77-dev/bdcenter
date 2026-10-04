import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { serviceLabel } from '@/content/appointments';
import { surveyCopy, surveyInvite, surveyKindLabel } from '@/content/surveys';
import { toCsv } from '@/lib/csv';
import { formatDateTime } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { optionalText, toLatinDigits } from '@/lib/validation';
import { getBookingSurveyTarget } from '@/modules/appointments/service';
import { recordAudit } from '@/modules/audit/service';
import { getConsultingRequest } from '@/modules/consulting/service';
import { sendSurveyInvite } from '@/modules/notifications/service';
import { getEnrollmentSurveyTarget } from '@/modules/training/service';

/**
 * Satisfaction surveys (owner's request, 2026-10-04). When staff mark a
 * consulting request, a booking or a course enrollment «انجام شده» with the
 * survey box ticked, the person gets an SMS (and an email when one is on
 * file) with a personal link, /survey/<token>, to a score from 1 to 5 and an
 * optional comment. There is no login: the link is the key. Its token is 32
 * random bytes and only its SHA-256 is stored. One survey per request,
 * booking or enrollment; it can be answered once, within SURVEY_DAYS.
 */

export type SurveyKind = keyof typeof surveyKindLabel;
export const SURVEY_KINDS = Object.keys(surveyKindLabel) as SurveyKind[];
export const SURVEY_DAYS = 30;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
/** base64url of 32 bytes. */
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

function surveyLink(token: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3010';
  return new URL(`/survey/${token}`, base).toString();
}

type Target = {
  entity: 'ConsultingRequest' | 'Booking' | 'Enrollment';
  subject: string;
  groupId: string | null;
  groupLabel: string | null;
  phone: string;
  email: string | null;
};

async function findTarget(kind: SurveyKind, targetId: string): Promise<Target | null> {
  if (kind === 'CONSULTING') {
    const request = await getConsultingRequest(targetId);
    if (!request) return null;
    return {
      entity: 'ConsultingRequest',
      subject: `درخواست مشاورهٔ «${request.topic}»`,
      groupId: null,
      groupLabel: null,
      phone: request.phone,
      email: request.email,
    };
  }
  if (kind === 'BOOKING') {
    const booking = await getBookingSurveyTarget(targetId);
    if (!booking) return null;
    return {
      entity: 'Booking',
      subject: `نوبت ${serviceLabel[booking.service]} با ${booking.staffName}`,
      groupId: booking.staffId,
      groupLabel: booking.staffName,
      phone: booking.phone,
      email: booking.email,
    };
  }
  const enrollment = await getEnrollmentSurveyTarget(targetId);
  if (!enrollment) return null;
  return {
    entity: 'Enrollment',
    subject: `دوره «${enrollment.courseTitle}»`,
    groupId: enrollment.courseId,
    groupLabel: enrollment.courseTitle,
    phone: enrollment.phone,
    email: enrollment.email,
  };
}

/**
 * Creates the survey and sends its link; returns the link's token. Does
 * nothing (null) when this request, booking or enrollment already has one:
 * marking it done twice sends once.
 */
export async function sendSurvey(
  kind: SurveyKind,
  targetId: string,
  now = new Date(),
): Promise<string | null> {
  const target = await findTarget(kind, targetId);
  if (!target) return null;
  const token = randomBytes(32).toString('base64url');
  const { count } = await prisma.surveyInvite.createMany({
    data: [
      {
        kind,
        targetId,
        subject: target.subject,
        groupId: target.groupId,
        groupLabel: target.groupLabel,
        phone: target.phone,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + SURVEY_DAYS * 24 * 60 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });
  if (count === 0) return null;
  const smsSent = await sendSurveyInvite({
    entity: target.entity,
    entityId: targetId,
    phone: target.phone,
    email: target.email,
    notice: surveyInvite(target.subject, surveyLink(token)),
  });
  await prisma.surveyInvite.update({
    where: { kind_targetId: { kind, targetId } },
    data: { smsSent },
  });
  return token;
}

// ---------------------------------------------------------------------------
// Public: answering
// ---------------------------------------------------------------------------

export type SurveyState =
  { status: 'open'; subject: string } | { status: 'answered' | 'expired' | 'not-found' };

export async function getSurvey(token: string, now = new Date()): Promise<SurveyState> {
  if (!tokenPattern.test(token)) return { status: 'not-found' };
  const survey = await prisma.surveyInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { subject: true, answeredAt: true, expiresAt: true },
  });
  if (!survey) return { status: 'not-found' };
  if (survey.answeredAt) return { status: 'answered' };
  if (survey.expiresAt <= now) return { status: 'expired' };
  return { status: 'open', subject: survey.subject };
}

export const surveyAnswerSchema = z.object({
  score: z.preprocess(
    (value) => (typeof value === 'string' ? Number(toLatinDigits(value)) : value),
    z
      .number({
        required_error: surveyCopy.scoreRequired,
        invalid_type_error: surveyCopy.scoreRequired,
      })
      .int(surveyCopy.scoreRequired)
      .min(1, surveyCopy.scoreRequired)
      .max(5, surveyCopy.scoreRequired),
  ),
  comment: optionalText('توضیح', 1000),
});

/**
 * Stores the answer once: the update only matches an open survey, so two
 * submits of the same link cannot both count.
 */
export async function answerSurvey(
  token: string,
  input: z.infer<typeof surveyAnswerSchema>,
  now = new Date(),
): Promise<SurveyState['status'] | 'saved'> {
  if (!tokenPattern.test(token)) return 'not-found';
  const { count } = await prisma.surveyInvite.updateMany({
    where: { tokenHash: hashToken(token), answeredAt: null, expiresAt: { gt: now } },
    data: { score: input.score, comment: input.comment ?? null, answeredAt: now },
  });
  if (count === 1) return 'saved';
  const state = await getSurvey(token, now);
  return state.status === 'open' ? 'not-found' : state.status;
}

// ---------------------------------------------------------------------------
// Admin: results
// ---------------------------------------------------------------------------

export type SurveyFilter = { kind?: SurveyKind; groupId?: string };

export const surveyFilterSchema = z.object({
  kind: z
    .enum(SURVEY_KINDS as [SurveyKind, ...SurveyKind[]])
    .optional()
    .catch(undefined),
  groupId: z.string().max(40).optional().catch(undefined),
});

export type SurveySummaryRow = {
  kind: SurveyKind;
  groupId: string | null;
  groupLabel: string | null;
  sent: number;
  answered: number;
  average: number | null;
};

/** Sent, answered and average score per kind and per course or consultant. */
export async function surveySummary(): Promise<SurveySummaryRow[]> {
  const groups = await prisma.surveyInvite.groupBy({
    by: ['kind', 'groupId'],
    _count: { _all: true, answeredAt: true },
    _avg: { score: true },
    _max: { groupLabel: true },
    orderBy: [{ kind: 'asc' }, { groupId: 'asc' }],
  });
  return groups.map((group) => ({
    kind: group.kind,
    groupId: group.groupId,
    groupLabel: group._max.groupLabel,
    sent: group._count._all,
    answered: group._count.answeredAt,
    average: group._avg.score,
  }));
}

function answeredWhere(filter: SurveyFilter) {
  return {
    answeredAt: { not: null },
    ...(filter.kind ? { kind: filter.kind } : {}),
    ...(filter.groupId ? { groupId: filter.groupId } : {}),
  };
}

/** Answers, newest first. */
export async function listSurveyAnswers(filter: SurveyFilter, limit = 300) {
  return prisma.surveyInvite.findMany({
    where: answeredWhere(filter),
    orderBy: { answeredAt: 'desc' },
    take: limit,
    select: {
      id: true,
      kind: true,
      subject: true,
      groupLabel: true,
      score: true,
      comment: true,
      answeredAt: true,
      phone: true,
    },
  });
}

/** CSV of the answers (audited: it carries phone numbers). */
export async function exportSurveyAnswersCsv(filter: SurveyFilter, actorId: string) {
  const rows = await prisma.surveyInvite.findMany({
    where: answeredWhere(filter),
    orderBy: { answeredAt: 'desc' },
  });
  await recordAudit({
    actorId,
    action: 'survey.export',
    entity: 'SurveyInvite',
    metadata: { kind: filter.kind ?? null, groupId: filter.groupId ?? null, count: rows.length },
  });
  return toCsv([
    ['نوع', 'موضوع', 'دوره یا مشاور', 'نمره', 'توضیح', 'شماره همراه', 'زمان پاسخ'],
    ...rows.map((row) => [
      surveyKindLabel[row.kind],
      row.subject,
      row.groupLabel ?? '',
      String(row.score ?? ''),
      row.comment ?? '',
      row.phone,
      row.answeredAt ? formatDateTime(row.answeredAt) : '',
    ]),
  ]);
}
