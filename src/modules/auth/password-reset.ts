import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/modules/audit/service';
import { emailAvailable, sendEmail } from '@/modules/messaging/email';
import { clear, consume, LIMITS } from '@/modules/ratelimit/service';
import { hashPassword } from './password';
import { adminLoginEmailKey, passwordSchema } from './users';

/**
 * «رمز را فراموش کرده‌ام» for panel users (owner's request, 2026-10-03): a
 * one-time link by email, valid for 30 minutes. Only a hash of the token is
 * stored. The answer never says whether an address has an account. Setting
 * the new password signs the user out everywhere and lifts a login lockout;
 * two-step login, if on, is still asked at the next sign-in.
 */

const TOKEN_TTL_MS = 30 * 60 * 1000;

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export const forgotSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
    z.string({ required_error: 'ایمیل را وارد کنید.' }).email('ایمیل معتبر نیست.').max(200),
  ),
});

export type ForgotResult = 'sent' | 'throttled' | 'unavailable';

/**
 * Emails a reset link when the address belongs to an active panel user.
 * Returns 'sent' for unknown addresses too, so the form reveals nothing. The
 * link is made and mailed through `later` (the action passes `after`), so a
 * known address does not answer more slowly than an unknown one.
 */
export async function requestPasswordReset(
  email: string,
  clientIp: string,
  siteUrl: string,
  later: (task: () => Promise<void>) => unknown = (task) => task(),
): Promise<ForgotResult> {
  const withinLimits =
    (await consume(`admin-reset:email:${email}`, LIMITS.adminPasswordReset)) &&
    (await consume(`admin-reset:ip:${clientIp}`, LIMITS.adminPasswordReset));
  if (!withinLimits) return 'throttled';
  if (!emailAvailable()) return 'unavailable';

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user?.isActive) return 'sent';

  await later(async () => {
    const token = randomBytes(32).toString('base64url');
    await prisma.$transaction([
      // Only the newest link works.
      prisma.adminPasswordReset.deleteMany({ where: { adminId: user.id, usedAt: null } }),
      prisma.adminPasswordReset.create({
        data: {
          adminId: user.id,
          tokenHash: hash(token),
          expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
      }),
    ]);
    const link = new URL(`/admin/login/reset?token=${token}`, siteUrl).toString();
    const sent = await sendEmail({
      to: user.email,
      subject: 'بازیابی رمز عبور پنل مدیریت',
      text: `${user.fullName} عزیز،\n\nبرای انتخاب رمز تازهٔ پنل مدیریت سایت مرکز توسعه کسب‌وکار، پیوند زیر را تا ۳۰ دقیقهٔ دیگر باز کنید:\n${link}\n\nاگر شما درخواست نداده‌اید، این نامه را نادیده بگیرید؛ رمز فعلی شما تغییری نمی‌کند.`,
    });
    if (!sent) throw new Error('The password-reset email could not be sent.');
    await recordAudit({
      actorId: user.id,
      action: 'admin.password.reset-requested',
      entity: 'AdminUser',
      entityId: user.id,
    });
  });
  return 'sent';
}

/** Whether a link can still be used (for showing the form or an "expired" notice). */
export async function resetTokenValid(token: string): Promise<boolean> {
  if (!token) return false;
  const reset = await prisma.adminPasswordReset.findUnique({ where: { tokenHash: hash(token) } });
  return Boolean(reset && !reset.usedAt && reset.expiresAt > new Date());
}

export const newPasswordSchema = z
  .object({
    token: z.string().min(20).max(100),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ['confirm'],
    message: 'تکرار رمز با رمز یکسان نیست.',
  });

/** Sets the new password; false when the link is wrong, used or expired. */
export async function completePasswordReset(token: string, password: string): Promise<boolean> {
  const tokenHash = hash(token);
  // Marking the link used in the same statement that checks it makes it single-use.
  const { count } = await prisma.adminPasswordReset.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (count !== 1) return false;
  const reset = await prisma.adminPasswordReset.findUniqueOrThrow({ where: { tokenHash } });
  const user = await prisma.adminUser.update({
    where: { id: reset.adminId },
    data: {
      passwordHash: await hashPassword(password),
      sessionVersion: { increment: 1 },
      mustChangePassword: false,
    },
    select: { id: true, email: true },
  });
  await clear(adminLoginEmailKey(user.email));
  await recordAudit({
    actorId: user.id,
    action: 'admin.password.reset-by-email',
    entity: 'AdminUser',
    entityId: user.id,
  });
  return true;
}
