import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/modules/audit/service';
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

// ---------------------------------------------------------------------------
// Login throttling: in-memory, per email and per client address. Enough for a
// single-instance deployment; move to the database if the app is scaled out.
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

function isThrottled(keys: string[]): boolean {
  const now = Date.now();
  return keys.some((key) => {
    const entry = failures.get(key);
    return entry !== undefined && entry.resetAt > now && entry.count >= MAX_ATTEMPTS;
  });
}

function noteFailure(keys: string[]) {
  const now = Date.now();
  for (const key of keys) {
    const entry = failures.get(key);
    if (!entry || entry.resetAt <= now) failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
    else entry.count += 1;
  }
}

export type LoginResult = { ok: true } | { ok: false; reason: 'invalid' | 'throttled' };

export async function login(
  email: string,
  password: string,
  clientIp: string,
): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const keys = [`email:${normalizedEmail}`, `ip:${clientIp}`];
  if (isThrottled(keys)) return { ok: false, reason: 'throttled' };

  const user = await prisma.adminUser.findUnique({ where: { email: normalizedEmail } });
  const valid = await verifyPassword(user?.passwordHash ?? (await dummyHash), password);
  if (!user || !valid || !user.isActive) {
    noteFailure(keys);
    return { ok: false, reason: 'invalid' };
  }

  for (const key of keys) failures.delete(key);
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
