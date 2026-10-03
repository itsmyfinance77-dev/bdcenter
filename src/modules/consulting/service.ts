import { z } from 'zod';
import { membershipTierLabel, requestStatusLabel } from '@/content/admin';
import { toCsv } from '@/lib/csv';
import { formatDateTime } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { email, nationalId, optionalText, phone, requiredText } from '@/lib/validation';
import { recordAudit } from '@/modules/audit/service';
import { getMembershipTier } from '@/modules/membership/service';
import { countCreatedPerDay } from '@/lib/daily-counts';

export const consultingRequestSchema = z.object({
  fullName: requiredText('نام و نام خانوادگی', 120),
  nationalId,
  phone: phone(true),
  email: email(false),
  companyName: optionalText('نام شرکت', 200),
  topic: requiredText('موضوع مشاوره', 200),
  description: optionalText('توضیحات', 4000),
});

export type ConsultingRequestInput = z.infer<typeof consultingRequestSchema>;

/**
 * Records a consulting request. The tier is stored for later review only
 * (OQ-BD-01). `memberId` links it to a signed-in member's account so they
 * can follow it on /account; anonymous requests stay allowed.
 */
export async function createConsultingRequest(
  input: ConsultingRequestInput,
  memberId: string | null = null,
) {
  const membershipTier = await getMembershipTier(input.nationalId);
  return prisma.consultingRequest.create({
    data: { ...input, membershipTier, memberId },
    select: { id: true },
  });
}

/** A member's own requests, newest first. */
export async function listMemberConsultingRequests(memberId: string) {
  return prisma.consultingRequest.findMany({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, topic: true, status: true, createdAt: true, updatedAt: true },
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export const requestStatusSchema = z.enum(['NEW', 'IN_REVIEW', 'ACCEPTED', 'REJECTED', 'DONE']);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

export async function listConsultingRequests(page: number, status?: RequestStatus) {
  const where = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.consultingRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.consultingRequest.count({ where }),
  ]);
  return { items, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getConsultingRequest(id: string) {
  return prisma.consultingRequest.findUnique({ where: { id } });
}

/** Returns whether the status actually changed. */
export async function setConsultingStatus(id: string, status: RequestStatus, actorId: string) {
  const before = await prisma.consultingRequest.findUniqueOrThrow({
    where: { id },
    select: { status: true },
  });
  await prisma.consultingRequest.update({ where: { id }, data: { status } });
  await recordAudit({
    actorId,
    action: 'consulting.status',
    entity: 'ConsultingRequest',
    entityId: id,
    metadata: { status },
  });
  return before.status !== status;
}

export async function countNewConsultingRequests() {
  return prisma.consultingRequest.count({ where: { status: 'NEW' } });
}

/** Consulting requests per Tehran day, for the statistics dashboard. */
export function countConsultingPerDay(from: Date) {
  return countCreatedPerDay('consulting', from);
}

/** Consulting requests (optionally of one status) as CSV for Excel, audited. */
export async function exportConsultingCsv(actorId: string, status?: RequestStatus) {
  const requests = await prisma.consultingRequest.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'asc' },
  });
  const rows = requests.map((r) => [
    formatDateTime(r.createdAt),
    requestStatusLabel[r.status],
    r.fullName,
    r.phone,
    r.nationalId ?? '',
    r.companyName ?? '',
    r.email ?? '',
    r.topic,
    r.description ?? '',
    r.membershipTier ? membershipTierLabel[r.membershipTier] : '',
  ]);
  await recordAudit({
    actorId,
    action: 'consulting.export',
    entity: 'ConsultingRequest',
    metadata: { rows: rows.length, status: status ?? 'all' },
  });
  return toCsv([
    [
      'تاریخ',
      'وضعیت',
      'نام',
      'تلفن',
      'کد/شناسه ملی',
      'شرکت',
      'ایمیل',
      'موضوع',
      'توضیحات',
      'سطح عضویت',
    ],
    ...rows,
  ]);
}
