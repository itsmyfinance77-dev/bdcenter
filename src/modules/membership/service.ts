import { prisma, type MembershipTier } from '@/lib/prisma';

/**
 * The single lookup other domains use to resolve a visitor's membership tier.
 *
 * OQ-BD-01: the tier is only recorded on requests. No price, discount or
 * free/paid gate may be derived from it until the employer confirms the rule;
 * when that lands, it belongs here, not at the call sites.
 */
export async function getMembershipTier(
  nationalId: string | undefined,
): Promise<MembershipTier | null> {
  if (!nationalId) return null;
  const record = await prisma.membershipRecord.findUnique({
    where: { nationalId },
    select: { tier: true },
  });
  return record?.tier ?? null;
}
