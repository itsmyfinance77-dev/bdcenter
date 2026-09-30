import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { email, nationalId, optionalText, phone, requiredText } from '@/lib/validation';
import { recordAudit } from '@/modules/audit/service';
import { getMembershipTier } from '@/modules/membership/service';

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

/** Records a consulting request. The tier is stored for later review only (OQ-BD-01). */
export async function createConsultingRequest(input: ConsultingRequestInput) {
  const membershipTier = await getMembershipTier(input.nationalId);
  return prisma.consultingRequest.create({
    data: { ...input, membershipTier },
    select: { id: true },
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

export async function setConsultingStatus(id: string, status: RequestStatus, actorId: string) {
  await prisma.consultingRequest.update({ where: { id }, data: { status } });
  await recordAudit({
    actorId,
    action: 'consulting.status',
    entity: 'ConsultingRequest',
    entityId: id,
    metadata: { status },
  });
}

export async function countNewConsultingRequests() {
  return prisma.consultingRequest.count({ where: { status: 'NEW' } });
}
