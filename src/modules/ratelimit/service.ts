import { prisma } from '@/lib/prisma';

/**
 * Fixed-window rate limiting stored in PostgreSQL, so limits hold across
 * restarts and across several app instances. Each check is one atomic upsert.
 */

export type Limit = { max: number; windowSeconds: number };

/** Named limits for every public entry point. Tune here, not at call sites. */
export const LIMITS = {
  // Public forms: generous for people, tight enough to stop a flood.
  // Counts every attempt, including ones that fail validation.
  publicForm: { max: 20, windowSeconds: 60 * 60 },
  // Admin login failures, per email and per client address.
  adminLogin: { max: 5, windowSeconds: 15 * 60 },
  // «رمز را فراموش کرده‌ام» emails, per email and per client address.
  adminPasswordReset: { max: 3, windowSeconds: 60 * 60 },
  // SMS codes cost money and can be used to harass a number.
  otpSendPerPhone: { max: 3, windowSeconds: 15 * 60 },
  otpSendPerIp: { max: 10, windowSeconds: 60 * 60 },
  // Safety valve against SMS pumping from many addresses: all numbers together.
  otpSendGlobal: { max: 300, windowSeconds: 60 * 60 },
  // Anonymous page-view beacons: generous, only stops one address inflating the counts.
  pageViews: { max: 600, windowSeconds: 60 * 60 },
  // Error alert emails, all errors together: a broken deploy must not flood the inbox.
  errorAlerts: { max: 10, windowSeconds: 60 * 60 },
  // Wrong codes, per phone: stops guessing a 6-digit code.
  otpVerifyPerPhone: { max: 5, windowSeconds: 15 * 60 },
} as const satisfies Record<string, Limit>;

/**
 * Counts one hit against `key` and reports whether it is still within the
 * limit. The window starts at the first hit and resets once it has passed.
 */
export async function consume(key: string, limit: Limit): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limit_buckets (key, count, "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${limit.windowSeconds}))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limit_buckets."resetAt" <= now() THEN 1
                   ELSE rate_limit_buckets.count + 1 END,
      "resetAt" = CASE WHEN rate_limit_buckets."resetAt" <= now()
                       THEN now() + make_interval(secs => ${limit.windowSeconds})
                       ELSE rate_limit_buckets."resetAt" END
    RETURNING count`;
  // Old rows are only clutter (an expired row behaves like a missing one);
  // sweep them now and then instead of on every request.
  if (Math.random() < 0.01) void sweepExpired();
  return (rows[0]?.count ?? 0) <= limit.max;
}

/** True when `key` has already used up its limit, without counting a hit. */
export async function isExhausted(key: string, limit: Limit): Promise<boolean> {
  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });
  return bucket !== null && bucket.resetAt > new Date() && bucket.count >= limit.max;
}

/** Forgets `key`, e.g. after a successful login. */
export async function clear(...keys: string[]) {
  await prisma.rateLimitBucket.deleteMany({ where: { key: { in: keys } } });
}

async function sweepExpired() {
  try {
    await prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lte: new Date() } } });
  } catch (error) {
    console.error('rate limit sweep failed', error);
  }
}
