import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/modules/audit/service';
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
    select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
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
    data: { passwordHash: await hashPassword(next), sessionVersion: { increment: 1 } },
  });
  await recordAudit({
    actorId: actor.id,
    action: 'admin.password',
    entity: 'AdminUser',
    entityId: actor.id,
  });
  return { ok: true as const };
}
