import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/modules/audit/service';
import { clear } from '@/modules/ratelimit/service';
import { hashPassword, verifyPassword } from './password';

/** Admin account management. Free of request APIs so CLI scripts can use it too. */

export type AdminRole = 'ADMIN' | 'EDITOR';

export const passwordSchema = z
  .string()
  .min(12, 'رمز عبور باید حداقل ۱۲ کاراکتر باشد.')
  .max(200, 'رمز عبور بیش از حد طولانی است.');

export const newAdminSchema = z.object({
  fullName: z.string().trim().min(1, 'نام را وارد کنید.').max(120),
  email: z.string().trim().toLowerCase().email('ایمیل معتبر نیست.'),
  role: z.enum(['ADMIN', 'EDITOR']),
  password: passwordSchema,
});

export async function listAdmins() {
  return prisma.adminUser.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      totpEnabledAt: true,
      mustChangePassword: true,
    },
  });
}

export async function createAdmin(input: z.infer<typeof newAdminSchema>, actorId: string | null) {
  const exists = await prisma.adminUser.findUnique({ where: { email: input.email } });
  if (exists) return { ok: false as const, error: 'کاربری با این ایمیل وجود دارد.' };
  const user = await prisma.adminUser.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      role: input.role,
      passwordHash: await hashPassword(input.password),
      // Someone else chose this password: the new user is asked to replace it.
      mustChangePassword: actorId !== null,
    },
  });
  if (actorId) {
    await recordAudit({
      actorId,
      action: 'admin.create',
      entity: 'AdminUser',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });
  }
  return { ok: true as const };
}

export async function setAdminActive(userId: string, isActive: boolean, actor: { id: string }) {
  if (userId === actor.id)
    return { ok: false as const, error: 'نمی‌توانید حساب خودتان را غیرفعال کنید.' };
  await prisma.adminUser.update({
    where: { id: userId },
    data: { isActive, sessionVersion: { increment: 1 } },
  });
  await recordAudit({
    actorId: actor.id,
    action: isActive ? 'admin.activate' : 'admin.deactivate',
    entity: 'AdminUser',
    entityId: userId,
  });
  return { ok: true as const };
}

export async function changeOwnPassword(actor: { id: string }, current: string, next: string) {
  const user = await prisma.adminUser.findUniqueOrThrow({ where: { id: actor.id } });
  if (!(await verifyPassword(user.passwordHash, current))) {
    return { ok: false as const, error: 'رمز عبور فعلی نادرست است.' };
  }
  await prisma.adminUser.update({
    where: { id: actor.id },
    // Also signs out every other browser; the caller re-issues this one's cookie.
    data: {
      passwordHash: await hashPassword(next),
      sessionVersion: { increment: 1 },
      mustChangePassword: false,
    },
  });
  await recordAudit({
    actorId: actor.id,
    action: 'admin.password',
    entity: 'AdminUser',
    entityId: actor.id,
  });
  return { ok: true as const };
}

/** Rate-limit key for failed admin logins per email (used by login and by password reset). */
export function adminLoginEmailKey(email: string): string {
  return `admin-login:email:${email.trim().toLowerCase()}`;
}

/** Letters and digits that cannot be confused when read out or copied by hand. */
const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** A random password like "k7Pq-Xm3w-RtZ9-b2Fh" (16 characters, about 95 bits). */
export function generatePassword(): string {
  const chars = Array.from(
    { length: 16 },
    () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)],
  );
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join('')).join('-');
}

export const resetPasswordSchema = z.object({
  // Empty: the system generates one.
  password: z.union([z.literal(''), passwordSchema]),
});

/**
 * An ADMIN sets a new password for another user who forgot theirs. Signs the
 * user out everywhere, lifts a login lockout, and asks them to choose their
 * own password after signing in. Returns the generated password, if any, to
 * be shown once.
 */
export async function resetAdminPassword(
  userId: string,
  password: string,
  actor: { id: string },
): Promise<{ ok: true; generated: string | null } | { ok: false; error: string }> {
  if (userId === actor.id) {
    return { ok: false, error: 'رمز خودتان را از «حساب من و امنیت» تغییر دهید.' };
  }
  const user = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) return { ok: false, error: 'این کاربر پیدا نشد.' };

  const generated = password ? null : generatePassword();
  await prisma.adminUser.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(password || generated!),
      sessionVersion: { increment: 1 },
      mustChangePassword: true,
    },
  });
  await clear(adminLoginEmailKey(user.email));
  await recordAudit({
    actorId: actor.id,
    action: 'admin.password.reset',
    entity: 'AdminUser',
    entityId: userId,
    metadata: { email: user.email, generated: generated !== null },
  });
  return { ok: true, generated };
}
