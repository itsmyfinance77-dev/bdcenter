import 'server-only';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { z } from 'zod';
import { memberCopy } from '@/content/members';
import { servedOverHttps } from '@/lib/https';
import { Prisma, prisma } from '@/lib/prisma';
import {
  email,
  legalNationalId,
  mobilePhone,
  nationalCode,
  optionalText,
  postalCode,
  requiredText,
  toLatinDigits,
} from '@/lib/validation';
import { recordAudit } from '@/modules/audit/service';
import {
  MEMBER_COOKIE,
  MEMBER_SESSION_MAX_AGE_SECONDS,
  signSession,
  verifySession,
} from '@/modules/auth/session-token';
import {
  checkUpload,
  checkUploadContent,
  deleteStoredFile,
  storedFileSchema,
  storeUpload,
} from '@/modules/files/service';
import { clear, consume, LIMITS } from '@/modules/ratelimit/service';
import { getSetting } from '@/modules/settings/service';
import { memberAccess, type IdentityState, type MemberAccess } from './access';
import { smsSender } from '@/modules/messaging/sms';
import { approvalLabel, personTypeLabel } from '@/content/members';
import { toCsv } from '@/lib/csv';
import { formatDateTime } from '@/lib/format';

export { safeMemberNext } from './next-path';
export { memberAccess, type MemberAccess } from './access';

/**
 * Public member accounts (ADR-0002): phone number + SMS one-time code, no
 * passwords. Signing in with a new number creates the account.
 */

const OTP_TTL_MS = 2 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

export const OTP_TTL_SECONDS = OTP_TTL_MS / 1000;

function otpSecret(): string {
  const secret = process.env.OTP_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('OTP_SECRET must be set to at least 32 characters.');
  return secret;
}

function hashCode(phone: string, code: string): Buffer {
  return createHmac('sha256', otpSecret()).update(`${phone}:${code}`).digest();
}

export const phoneSchema = z.object({ phone: mobilePhone });

export const verifySchema = z.object({
  phone: mobilePhone,
  code: z.preprocess(
    (value) => (typeof value === 'string' ? toLatinDigits(value).trim() : value),
    z
      .string({ required_error: 'کد ۶ رقمی را وارد کنید.' })
      .regex(/^\d{6}$/, 'کد ۶ رقمی را وارد کنید.'),
  ),
});

export type OtpRequestResult = { ok: true } | { ok: false; error: string };

/** Sends a fresh sign-in code to `phone`, replacing any earlier one. */
export async function requestOtp(phone: string, clientIp: string): Promise<OtpRequestResult> {
  const withinLimits =
    (await consume(`otp-send:phone:${phone}`, LIMITS.otpSendPerPhone)) &&
    (await consume(`otp-send:ip:${clientIp}`, LIMITS.otpSendPerIp)) &&
    (await consume('otp-send:global', LIMITS.otpSendGlobal));
  if (!withinLimits) {
    return { ok: false, error: 'تعداد درخواست کد زیاد است. چند دقیقه دیگر دوباره تلاش کنید.' };
  }

  const sender = smsSender();
  if (!sender) return { ok: false, error: memberCopy.smsUnavailable };

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await prisma.otpChallenge.upsert({
    where: { phone },
    create: {
      phone,
      codeHash: hashCode(phone, code).toString('hex'),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
    update: {
      codeHash: hashCode(phone, code).toString('hex'),
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      createdAt: new Date(),
    },
  });

  if (!(await sender.sendOtp(phone, code, memberCopy.otpSms(code)))) {
    await prisma.otpChallenge.deleteMany({ where: { phone } });
    return { ok: false, error: memberCopy.smsUnavailable };
  }
  return { ok: true };
}

export type OtpVerifyResult =
  { ok: true; needsProfile: boolean } | { ok: false; error: string; expired?: boolean };

/**
 * Checks a code and, when it is right, signs the member in (creating the
 * account on first use). Each code works once and allows 5 wrong tries.
 */
export async function verifyOtp(phone: string, code: string): Promise<OtpVerifyResult> {
  if (!(await consume(`otp-verify:phone:${phone}`, LIMITS.otpVerifyPerPhone))) {
    return { ok: false, error: 'تلاش‌های نادرست زیاد بود. چند دقیقه دیگر دوباره تلاش کنید.' };
  }

  const expired = {
    ok: false,
    error: 'کد منقضی شده است. دوباره کد بگیرید.',
    expired: true,
  } as const;
  const challenge = await prisma.otpChallenge.findUnique({ where: { phone } });
  if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= OTP_MAX_ATTEMPTS) {
    return expired;
  }

  const expected = Buffer.from(challenge.codeHash, 'hex');
  const actual = hashCode(phone, code);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await prisma.otpChallenge.update({ where: { phone }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: 'کد واردشده درست نیست.' };
  }

  // Deleting by the exact hash makes the code single-use even if two
  // requests race with the same code: only one delete matches.
  const { count } = await prisma.otpChallenge.deleteMany({
    where: { phone, codeHash: challenge.codeHash },
  });
  if (count !== 1) return expired;
  await clear(`otp-verify:phone:${phone}`);

  const member = await prisma.member.upsert({
    where: { phone },
    create: { phone, lastLoginAt: new Date() },
    update: { lastLoginAt: new Date() },
  });
  if (!member.isActive) return { ok: false, error: 'این حساب غیرفعال شده است.' };

  (await cookies()).set(
    MEMBER_COOKIE,
    await signSession(member.id, 'member', member.sessionVersion),
    {
      httpOnly: true,
      secure: servedOverHttps(),
      sameSite: 'lax',
      path: '/',
      maxAge: MEMBER_SESSION_MAX_AGE_SECONDS,
    },
  );
  const nationalCardRequired = await getSetting('members.nationalCardRequired');
  return {
    ok: true,
    needsProfile: memberAccess(identityOf(member), nationalCardRequired) === 'incomplete',
  };
}

type MemberRow = NonNullable<Awaited<ReturnType<typeof prisma.member.findUnique>>>;

function identityOf(member: MemberRow): IdentityState {
  return {
    fullName: member.fullName,
    nationalId: member.nationalId,
    postalCode: member.postalCode,
    personType: member.personType,
    companyName: member.companyName,
    legalNationalId: member.legalNationalId,
    hasLetter: storedFileSchema.safeParse(member.letterFile).success,
    hasNationalCard: storedFileSchema.safeParse(member.nationalCardFile).success,
    approval: member.approval,
  };
}

export type CurrentMember = IdentityState & {
  id: string;
  phone: string;
  email: string | null;
  approvalNote: string | null;
  /** Whether this member may enroll and book now (see ./access). */
  access: MemberAccess;
  nationalCardRequired: boolean;
};

/** The signed-in, active member for this request, or null. Cached per request. */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const session = await verifySession((await cookies()).get(MEMBER_COOKIE)?.value, 'member');
  if (!session) return null;
  const member = await prisma.member.findUnique({ where: { id: session.uid } });
  if (!member?.isActive || member.sessionVersion !== session.ver) return null;
  const nationalCardRequired = await getSetting('members.nationalCardRequired');
  const identity = identityOf(member);
  return {
    ...identity,
    id: member.id,
    phone: member.phone,
    email: member.email,
    approvalNote: member.approvalNote,
    access: memberAccess(identity, nationalCardRequired),
    nationalCardRequired,
  };
});

/** Gate for member pages and actions (default deny). */
export async function requireMember(next = '/account'): Promise<CurrentMember> {
  const member = await getCurrentMember();
  if (!member) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return member;
}

/** Signs this browser out. */
export async function logoutMember() {
  (await cookies()).delete({ name: MEMBER_COOKIE, path: '/' });
}

/** Signs out every browser holding this member's session. */
export async function logoutMemberEverywhere(memberId: string) {
  await prisma.member.update({
    where: { id: memberId },
    data: { sessionVersion: { increment: 1 } },
  });
  await logoutMember();
}

const blankToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const profileSchema = z
  .object({
    personType: z.enum(['INDIVIDUAL', 'LEGAL'], {
      errorMap: () => ({ message: 'مشخص کنید به‌عنوان شخص حقیقی ثبت‌نام می‌کنید یا حقوقی.' }),
    }),
    fullName: requiredText('نام و نام خانوادگی', 120),
    nationalId: nationalCode,
    postalCode,
    email: email(false),
    companyName: optionalText('نام شخص حقوقی', 200),
    legalNationalId: z.preprocess(blankToUndefined, legalNationalId.optional()),
  })
  .superRefine((value, ctx) => {
    if (value.personType !== 'LEGAL') return;
    if (!value.companyName) {
      ctx.addIssue({
        code: 'custom',
        path: ['companyName'],
        message: 'نام شخص حقوقی را وارد کنید.',
      });
    }
    if (!value.legalNationalId) {
      ctx.addIssue({
        code: 'custom',
        path: ['legalNationalId'],
        message: 'شناسه ملی شخص حقوقی را وارد کنید.',
      });
    }
  });

export type ProfileInput = z.infer<typeof profileSchema>;

/** Uploads on the profile: at most 5 MB each, so both fit in one form post. */
const MAX_PROFILE_UPLOAD_BYTES = 5 * 1024 * 1024;

const uploadKinds = {
  letter: {
    types: ['image/jpeg', 'image/png', 'application/pdf'],
    typeError: 'معرفی‌نامه باید تصویر JPG یا PNG یا فایل PDF باشد.',
    area: 'members/letters',
  },
  nationalCard: {
    types: ['image/jpeg', 'image/png'],
    typeError: 'تصویر کارت ملی باید JPG یا PNG باشد.',
    area: 'members/national-cards',
  },
} as const;

export type MemberFileKind = keyof typeof uploadKinds;

async function checkProfileUpload(kind: MemberFileKind, file: File): Promise<string | null> {
  if (!(uploadKinds[kind].types as readonly string[]).includes(file.type)) {
    return uploadKinds[kind].typeError;
  }
  if (file.size > MAX_PROFILE_UPLOAD_BYTES) return 'حجم فایل نباید بیشتر از ۵ مگابایت باشد.';
  return checkUpload(file) ?? (await checkUploadContent(file));
}

export type SaveProfileResult =
  | {
      ok: true;
      approval: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
      /** The legal-entity details are new or changed: an ADMIN should review them. */
      reviewNeeded: boolean;
    }
  | { ok: false; errors: Record<string, string> };

/**
 * Saves the member's identity. A representative of a legal entity goes back
 * to «در انتظار تأیید» whenever the company, its شناسه ملی or the letter
 * changes; an individual needs no review. Empty file inputs keep the files
 * already on record.
 */
export async function saveProfile(
  memberId: string,
  input: ProfileInput,
  uploads: { letter: File | null; nationalCard: File | null },
): Promise<SaveProfileResult> {
  const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId } });
  const current = identityOf(member);
  const legal = input.personType === 'LEGAL';
  const letter = legal && uploads.letter && uploads.letter.size > 0 ? uploads.letter : null;
  const card = uploads.nationalCard && uploads.nationalCard.size > 0 ? uploads.nationalCard : null;

  const errors: Record<string, string> = {};
  if (letter) {
    const problem = await checkProfileUpload('letter', letter);
    if (problem) errors.letter = problem;
  } else if (legal && !current.hasLetter) {
    errors.letter = 'تصویر معرفی‌نامه با سربرگ شرکت را بارگذاری کنید.';
  }
  if (card) {
    const problem = await checkProfileUpload('nationalCard', card);
    if (problem) errors.nationalCard = problem;
  } else if (!current.hasNationalCard && (await getSetting('members.nationalCardRequired'))) {
    errors.nationalCard = 'تصویر کارت ملی را بارگذاری کنید.';
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const newLetter = letter ? await storeUpload(uploadKinds.letter.area, letter) : null;
  const newCard = card ? await storeUpload(uploadKinds.nationalCard.area, card) : null;

  const legalChanged =
    member.personType !== 'LEGAL' ||
    member.companyName !== (input.companyName ?? null) ||
    member.legalNationalId !== (input.legalNationalId ?? null) ||
    newLetter !== null;
  const approval = !legal
    ? 'NOT_REQUIRED'
    : member.approval === 'APPROVED' && !legalChanged
      ? 'APPROVED'
      : 'PENDING';
  const reviewReset = approval !== member.approval || (legal && legalChanged);

  await prisma.member.update({
    where: { id: memberId },
    data: {
      personType: input.personType,
      fullName: input.fullName,
      nationalId: input.nationalId,
      postalCode: input.postalCode,
      email: input.email ?? null,
      companyName: legal ? input.companyName! : null,
      legalNationalId: legal ? input.legalNationalId! : null,
      ...(newLetter ? { letterFile: newLetter } : {}),
      ...(!legal ? { letterFile: Prisma.DbNull } : {}),
      ...(newCard ? { nationalCardFile: newCard } : {}),
      approval,
      ...(reviewReset ? { approvalNote: null, reviewedAt: null, reviewedById: null } : {}),
    },
  });

  const oldLetter = storedFileSchema.safeParse(member.letterFile);
  if (oldLetter.success && (newLetter || !legal)) await deleteStoredFile(oldLetter.data.storageKey);
  const oldCard = storedFileSchema.safeParse(member.nationalCardFile);
  if (oldCard.success && newCard) await deleteStoredFile(oldCard.data.storageKey);
  return { ok: true, approval, reviewNeeded: approval === 'PENDING' && legalChanged };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export type MemberListFilter = 'all' | 'pending';

export async function listMembers(page: number, query?: string, filter: MemberListFilter = 'all') {
  const q = query?.trim();
  const where = {
    ...(filter === 'pending' ? { approval: 'PENDING' as const } : {}),
    ...(q
      ? {
          OR: [
            { phone: { contains: q } },
            { fullName: { contains: q, mode: 'insensitive' as const } },
            { companyName: { contains: q, mode: 'insensitive' as const } },
            { nationalId: { contains: q } },
            { legalNationalId: { contains: q } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.member.count({ where }),
  ]);
  return { items, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Version in the member's personal calendar address (calendar domain). */
export async function getMemberCalendarVersion(id: string): Promise<number | null> {
  const member = await prisma.member.findUnique({
    where: { id },
    select: { calendarVersion: true, isActive: true },
  });
  return member?.isActive ? member.calendarVersion : null;
}

/** Gives the member a new personal calendar address; the old one stops working. */
export async function rotateMemberCalendar(id: string) {
  await prisma.member.update({ where: { id }, data: { calendarVersion: { increment: 1 } } });
}

export type MemberAudience = 'members' | 'individuals' | 'legal';

/** Mobile numbers of active members for a group SMS (broadcasts domain). */
export async function listMemberPhones(audience: MemberAudience): Promise<string[]> {
  const where =
    audience === 'individuals'
      ? { personType: 'INDIVIDUAL' as const }
      : audience === 'legal'
        ? { personType: 'LEGAL' as const, approval: 'APPROVED' as const }
        : {};
  const rows = await prisma.member.findMany({
    where: { isActive: true, ...where },
    select: { phone: true },
  });
  return rows.map((row) => row.phone);
}

/** Contact details for the notifications domain. */
export async function getMemberContact(id: string) {
  return prisma.member.findUnique({
    where: { id },
    select: { phone: true, email: true, companyName: true },
  });
}

export async function countPendingMembers() {
  return prisma.member.count({ where: { approval: 'PENDING', isActive: true } });
}

/** One member with their uploads and the other people registered for the same company. */
export async function getMemberForAdmin(id: string) {
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) return null;
  const colleagues = member.legalNationalId
    ? await prisma.member.findMany({
        where: { legalNationalId: member.legalNationalId, NOT: { id } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, fullName: true, phone: true, approval: true },
      })
    : [];
  const letter = storedFileSchema.safeParse(member.letterFile);
  const card = storedFileSchema.safeParse(member.nationalCardFile);
  return {
    ...member,
    letter: letter.success ? letter.data : null,
    nationalCard: card.success ? card.data : null,
    colleagues,
  };
}

/** An uploaded file of a member, for the admin download route. */
export async function getMemberFile(id: string, kind: MemberFileKind) {
  const member = await prisma.member.findUnique({
    where: { id },
    select: { letterFile: true, nationalCardFile: true },
  });
  const parsed = storedFileSchema.safeParse(
    kind === 'letter' ? member?.letterFile : member?.nationalCardFile,
  );
  return parsed.success ? parsed.data : null;
}

export const reviewSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('APPROVED') }),
  z.object({
    decision: z.literal('REJECTED'),
    note: requiredText('دلیل رد', 500),
  }),
]);

/**
 * An ADMIN approves or rejects a legal-entity representative. Returns the
 * member's phone for the SMS notice, or null when there was nothing to review.
 */
export async function reviewMember(
  id: string,
  review: z.infer<typeof reviewSchema>,
  actorId: string,
): Promise<string | null> {
  const note = review.decision === 'REJECTED' ? review.note : null;
  const { count } = await prisma.member.updateMany({
    where: { id, personType: 'LEGAL' },
    data: {
      approval: review.decision,
      approvalNote: note,
      reviewedAt: new Date(),
      reviewedById: actorId,
    },
  });
  if (count === 0) return null;
  await recordAudit({
    actorId,
    action: review.decision === 'APPROVED' ? 'member.approve' : 'member.reject',
    entity: 'Member',
    entityId: id,
    metadata: note ? { note } : undefined,
  });
  const member = await prisma.member.findUniqueOrThrow({ where: { id }, select: { phone: true } });
  return member.phone;
}

/** Deactivation also revokes the member's sessions at once. */
export async function setMemberActive(memberId: string, isActive: boolean, actorId: string) {
  await prisma.member.update({
    where: { id: memberId },
    data: { isActive, sessionVersion: { increment: 1 } },
  });
  await recordAudit({
    actorId,
    action: isActive ? 'member.activate' : 'member.deactivate',
    entity: 'Member',
    entityId: memberId,
  });
}

export async function countMembers() {
  return prisma.member.count();
}

/** Every member as CSV for Excel (ADMIN), with the export recorded in the audit log. */
export async function exportMembersCsv(actorId: string) {
  const members = await prisma.member.findMany({ orderBy: { createdAt: 'asc' } });
  const rows = members.map((m) => [
    formatDateTime(m.createdAt),
    m.phone,
    m.fullName ?? '',
    m.personType ? personTypeLabel[m.personType] : 'تکمیل نشده',
    m.nationalId ?? '',
    m.postalCode ?? '',
    m.companyName ?? '',
    m.legalNationalId ?? '',
    m.personType === 'LEGAL' ? approvalLabel[m.approval] : '',
    m.email ?? '',
    m.isActive ? 'فعال' : 'غیرفعال',
    m.lastLoginAt ? formatDateTime(m.lastLoginAt) : '',
  ]);
  await recordAudit({
    actorId,
    action: 'member.export',
    entity: 'Member',
    metadata: { rows: rows.length },
  });
  return toCsv([
    [
      'تاریخ عضویت',
      'شماره همراه',
      'نام',
      'نوع',
      'کد ملی',
      'کد پستی',
      'شخص حقوقی',
      'شناسه ملی شخص حقوقی',
      'وضعیت تأیید',
      'ایمیل',
      'وضعیت',
      'آخرین ورود',
    ],
    ...rows,
  ]);
}
