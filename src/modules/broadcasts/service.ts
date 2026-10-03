import { z } from 'zod';
import { broadcastAudienceLabel } from '@/content/admin';
import { prisma } from '@/lib/prisma';
import { mobilePhone, requiredText } from '@/lib/validation';
import { recordAudit } from '@/modules/audit/service';
import { listMemberPhones, type MemberAudience } from '@/modules/members/service';
import { smsSender } from '@/modules/messaging/sms';
import { listCourseEnrollmentPhones } from '@/modules/training/service';

/**
 * Group SMS (owner's request, 2026-10-03): an ADMIN writes one message for all
 * members, individuals, approved legal-entity representatives, or the people
 * enrolled in one course (e.g. «جلسهٔ فردا لغو شد»). Sending runs after the
 * response; the history keeps how many were sent and failed.
 */

/** Largest audience one message may go to, against mistakes and cost. */
export const MAX_RECIPIENTS = 3000;
/** Persian SMS: 70 characters in one part, 67 per part when longer. */
export const MAX_TEXT = 500;

export const broadcastSchema = z
  .object({
    audience: z.enum(['members', 'individuals', 'legal', 'course'], {
      errorMap: () => ({ message: 'گیرندگان را انتخاب کنید.' }),
    }),
    courseId: z.string().max(40).optional(),
    scope: z.enum(['accepted', 'all']).default('accepted'),
    text: requiredText('متن پیامک', MAX_TEXT),
  })
  .superRefine((value, ctx) => {
    if (value.audience === 'course' && !value.courseId) {
      ctx.addIssue({ code: 'custom', path: ['courseId'], message: 'دوره را انتخاب کنید.' });
    }
  });

export type BroadcastInput = z.infer<typeof broadcastSchema>;

async function resolve(input: BroadcastInput): Promise<{ label: string; phones: string[] } | null> {
  if (input.audience === 'course') {
    const course = await listCourseEnrollmentPhones(input.courseId!, input.scope);
    if (!course) return null;
    const scope = input.scope === 'accepted' ? 'پذیرفته‌شدگان' : 'همهٔ ثبت‌نام‌کنندگان';
    return { label: `${scope} دورهٔ «${course.title}»`, phones: course.phones };
  }
  return {
    label: broadcastAudienceLabel[input.audience],
    phones: await listMemberPhones(input.audience as MemberAudience),
  };
}

export type StartResult =
  { ok: true; id: string; recipients: number; phones: string[] } | { ok: false; error: string };

/** Records a broadcast and returns who to send it to; `runBroadcast` sends it. */
export async function startBroadcast(input: BroadcastInput, actorId: string): Promise<StartResult> {
  const target = await resolve(input);
  if (!target) return { ok: false, error: 'این دوره پیدا نشد.' };
  const phones = [
    ...new Set(
      target.phones.flatMap((phone) => {
        const parsed = mobilePhone.safeParse(phone);
        return parsed.success ? [parsed.data] : [];
      }),
    ),
  ];
  if (phones.length === 0) return { ok: false, error: 'برای این گروه گیرنده‌ای پیدا نشد.' };
  if (phones.length > MAX_RECIPIENTS) {
    return { ok: false, error: `تعداد گیرندگان بیش از ${MAX_RECIPIENTS} نفر است.` };
  }
  if (!smsSender()) return { ok: false, error: 'سامانهٔ پیامک فعال نیست.' };

  const broadcast = await prisma.smsBroadcast.create({
    data: {
      audience: input.audience,
      courseId: input.audience === 'course' ? input.courseId : null,
      audienceLabel: target.label,
      text: input.text,
      recipients: phones.length,
      createdById: actorId,
    },
  });
  await recordAudit({
    actorId,
    action: 'sms.broadcast',
    entity: 'SmsBroadcast',
    entityId: broadcast.id,
    metadata: { audience: target.label, recipients: phones.length },
  });
  return { ok: true, id: broadcast.id, recipients: phones.length, phones };
}

/** Sends a recorded broadcast one message at a time, keeping its counts current. */
export async function runBroadcast(id: string, phones: string[], text: string) {
  const sender = smsSender();
  let sent = 0;
  let failed = 0;
  for (const [index, phone] of phones.entries()) {
    const ok = sender ? await sender.send(phone, text) : false;
    if (ok) sent += 1;
    else failed += 1;
    if ((index + 1) % 25 === 0) {
      await prisma.smsBroadcast.update({ where: { id }, data: { sent, failed } });
    }
  }
  await prisma.smsBroadcast.update({
    where: { id },
    data: { sent, failed, finishedAt: new Date() },
  });
}

export async function listBroadcasts(limit = 50) {
  return prisma.smsBroadcast.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
}

/** How many active members each member audience reaches, for the form. */
export async function memberAudienceCounts(): Promise<Record<MemberAudience, number>> {
  const [members, individuals, legal] = await Promise.all([
    listMemberPhones('members'),
    listMemberPhones('individuals'),
    listMemberPhones('legal'),
  ]);
  return { members: members.length, individuals: individuals.length, legal: legal.length };
}
