import 'server-only';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { z } from 'zod';
import { memberCopy } from '@/content/members';
import { prisma } from '@/lib/prisma';
import {
  email,
  mobilePhone,
  nationalId,
  optionalText,
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
import { clear, consume, LIMITS } from '@/modules/ratelimit/service';
import { smsSender } from './sms';

export { safeMemberNext } from './next-path';

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

  if (!(await sender.send(phone, memberCopy.otpSms(code)))) {
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: MEMBER_SESSION_MAX_AGE_SECONDS,
    },
  );
  return { ok: true, needsProfile: !member.fullName };
}

export type CurrentMember = {
  id: string;
  phone: string;
  fullName: string | null;
  nationalId: string | null;
  companyName: string | null;
  email: string | null;
};

/** The signed-in, active member for this request, or null. Cached per request. */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const session = await verifySession((await cookies()).get(MEMBER_COOKIE)?.value, 'member');
  if (!session) return null;
  const member = await prisma.member.findUnique({ where: { id: session.uid } });
  if (!member?.isActive || member.sessionVersion !== session.ver) return null;
  return {
    id: member.id,
    phone: member.phone,
    fullName: member.fullName,
    nationalId: member.nationalId,
    companyName: member.companyName,
    email: member.email,
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

export const profileSchema = z.object({
  fullName: requiredText('نام و نام خانوادگی', 120),
  nationalId,
  companyName: optionalText('نام شرکت', 200),
  email: email(false),
});

export async function updateProfile(memberId: string, input: z.infer<typeof profileSchema>) {
  await prisma.member.update({
    where: { id: memberId },
    data: {
      fullName: input.fullName,
      nationalId: input.nationalId ?? null,
      companyName: input.companyName ?? null,
      email: input.email ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export async function listMembers(page: number, query?: string) {
  const q = query?.trim();
  const where = q
    ? {
        OR: [
          { phone: { contains: q } },
          { fullName: { contains: q, mode: 'insensitive' as const } },
          { companyName: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};
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
