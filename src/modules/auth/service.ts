import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/modules/audit/service';
import { clear, consume, isExhausted, LIMITS } from '@/modules/ratelimit/service';
import { hashPassword, verifyPassword } from './password';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSession,
  verifySession,
} from './session-token';
import type { AdminRole } from './users';

export type CurrentAdmin = { id: string; fullName: string; email: string; role: AdminRole };

// Verified against when the email is unknown, so response time does not reveal
// which addresses have accounts.
const dummyHash = hashPassword('timing-equalizer-not-a-real-password');

// Login throttling counts failures only, per email and per client address,
// in the shared rate-limit table (see src/modules/ratelimit).
async function isThrottled(keys: string[]): Promise<boolean> {
  const results = await Promise.all(keys.map((key) => isExhausted(key, LIMITS.adminLogin)));
  return results.some(Boolean);
}

async function noteFailure(keys: string[]) {
  await Promise.all(keys.map((key) => consume(key, LIMITS.adminLogin)));
}

export type LoginResult = { ok: true } | { ok: false; reason: 'invalid' | 'throttled' };

export async function login(
  email: string,
  password: string,
  clientIp: string,
): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const keys = [`admin-login:email:${normalizedEmail}`, `admin-login:ip:${clientIp}`];
  if (await isThrottled(keys)) return { ok: false, reason: 'throttled' };

  const user = await prisma.adminUser.findUnique({ where: { email: normalizedEmail } });
  const valid = await verifyPassword(user?.passwordHash ?? (await dummyHash), password);
  if (!user || !valid || !user.isActive) {
    await noteFailure(keys);
    return { ok: false, reason: 'invalid' };
  }

  await clear(...keys);
  await setAdminCookie(user.id, user.sessionVersion);
  await recordAudit({
    actorId: user.id,
    action: 'auth.login',
    entity: 'AdminUser',
    entityId: user.id,
  });
  return { ok: true };
}

async function setAdminCookie(adminId: string, sessionVersion: number) {
  (await cookies()).set(SESSION_COOKIE, await signSession(adminId, 'admin', sessionVersion), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Gives this browser a fresh cookie after `sessionVersion` changed (password change). */
export async function reissueAdminSession(adminId: string) {
  const user = await prisma.adminUser.findUniqueOrThrow({
    where: { id: adminId },
    select: { sessionVersion: true },
  });
  await setAdminCookie(adminId, user.sessionVersion);
}

/** Signs out every browser holding this admin's session, not just this one. */
export async function logout() {
  const admin = await getCurrentAdmin();
  if (admin) await revokeAdminSessions(admin.id);
  (await cookies()).delete({ name: SESSION_COOKIE, path: '/admin' });
}

export async function revokeAdminSessions(adminId: string) {
  await prisma.adminUser.update({
    where: { id: adminId },
    data: { sessionVersion: { increment: 1 } },
  });
}

/** The signed-in, active admin for this request, or null. Cached per request. */
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value, 'admin');
  if (!session) return null;
  const user = await prisma.adminUser.findUnique({
    where: { id: session.uid },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      sessionVersion: true,
    },
  });
  if (!user?.isActive || user.sessionVersion !== session.ver) return null;
  return { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
});

/**
 * Gate for every admin page and server action (default deny). Server actions
 * are public POST endpoints, so each one must call this itself; the admin
 * layout check alone is not enough.
 */
export async function requireAdmin(role?: AdminRole): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/admin/login');
  if (role === 'ADMIN' && admin.role !== 'ADMIN') redirect('/admin?denied=1');
  return admin;
}
