import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Checks the `Authorization: Bearer <CRON_SECRET>` header of a scheduler call
 * (/api/cron/*). Without a CRON_SECRET of at least 32 characters the jobs are
 * switched off. Hashing both sides first makes the comparison constant-time
 * whatever their lengths.
 */
export function checkCronAuth(
  header: string | null,
  secret = process.env.CRON_SECRET,
): 'ok' | 'unauthorized' | 'unconfigured' {
  const expected = secret?.trim() ?? '';
  if (expected.length < 32) return 'unconfigured';
  const given = header?.match(/^Bearer (.+)$/)?.[1] ?? '';
  const digest = (text: string) => createHash('sha256').update(text).digest();
  return given && timingSafeEqual(digest(given), digest(expected)) ? 'ok' : 'unauthorized';
}
