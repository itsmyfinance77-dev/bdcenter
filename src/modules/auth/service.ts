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
  (await cookies()).set(SESSION_COOKIE, await signSession(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  await recordAudit({
    actorId: user.id,
    action: 'auth.login',
    entity: 'AdminUser',
    entityId: user.id,
  });
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: '/admin' });
}

/** The signed-in, active admin for this request, or null. Cached per request. */
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await prisma.adminUser.findUnique({
    where: { id: session.uid },
    select: { id: true, fullName: true, email: true, role: true, isActive: true },
  });
  if (!user?.isActive) return null;
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
