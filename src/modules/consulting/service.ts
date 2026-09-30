import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { email, nationalId, optionalText, phone, requiredText } from '@/lib/validation';
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
