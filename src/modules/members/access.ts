import { isValidNationalCode } from '@/lib/validation';

/**
 * Whether a member may enroll in courses and book appointments (owner's
 * request, 2026-10-03). Everyone needs a complete profile: name, کد ملی,
 * postal code and whether they sign up as a person or for a legal entity
 * (plus a national card image when an ADMIN requires it). Representatives of
 * a legal entity also need the company's name, شناسه ملی and introduction
 * letter, and wait for an ADMIN to approve them.
 *
 * Pure, so pages, services and tests share one rule.
 */

export type MemberAccess = 'ok' | 'incomplete' | 'pending' | 'rejected';

export type IdentityState = {
  fullName: string | null;
  nationalId: string | null;
  postalCode: string | null;
  personType: 'INDIVIDUAL' | 'LEGAL' | null;
  companyName: string | null;
  legalNationalId: string | null;
  hasLetter: boolean;
  hasNationalCard: boolean;
  approval: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
};

export function memberAccess(member: IdentityState, nationalCardRequired: boolean): MemberAccess {
  const complete =
    Boolean(member.fullName) &&
    isValidNationalCode(member.nationalId ?? '') &&
    Boolean(member.postalCode) &&
    member.personType !== null &&
    (!nationalCardRequired || member.hasNationalCard);
  if (!complete) return 'incomplete';
  if (member.personType === 'INDIVIDUAL') return 'ok';
  if (!member.companyName || !member.legalNationalId || !member.hasLetter) return 'incomplete';
  if (member.approval === 'APPROVED') return 'ok';
  return member.approval === 'REJECTED' ? 'rejected' : 'pending';
}
