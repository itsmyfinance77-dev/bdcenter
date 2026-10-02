import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/modules/audit/service';
import { sendEmail } from '@/modules/messaging/email';
import { consume, LIMITS } from '@/modules/ratelimit/service';

/**
 * Server error reporting. Every error Next.js reports (page renders, route
 * handlers, server actions, middleware) lands in one ErrorGroup row per
 * fingerprint, so a crash that repeats a thousand times is one row with a
 * count. A new error — or one an admin had marked resolved — emails
 * ERROR_ALERT_EMAIL. Recording never throws: reporting must not add failures.
 */

type Env = Record<string, string | undefined>;

export type ErrorContext = {
  /** Request path as Next.js reports it; the query string is dropped. */
  path?: string;
  method?: string;
  /** Route pattern, e.g. /courses/[slug]. */
  route?: string;
  routeType?: string;
};

const MAX_MESSAGE = 1000;
const MAX_STACK = 8000;
const MAX_FIELD = 300;
/** Resolved errors that have stayed quiet this long are deleted. */
const RETENTION_DAYS = 90;

/** Next.js control flow (redirect, notFound, dynamic bail-out), not failures. */
const CONTROL_FLOW = /^(NEXT_|DYNAMIC_SERVER_USAGE|BAILOUT_TO_CLIENT_SIDE_RENDERING)/;

function clip(text: string | undefined | null, max: number): string | null {
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Path without query or fragment, so tokens in URLs are never stored. */
export function stripQuery(path: string | undefined): string | null {
  if (!path) return null;
  return clip(path.split(/[?#]/)[0], MAX_FIELD);
}

/**
 * Masks the parts of a message that change between occurrences of the same
 * bug (ids, numbers, quoted values) so they share one fingerprint.
 */
export function normalizeMessage(message: string): string {
  return message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/\bc[a-z0-9]{24}\b/g, '<id>')
    .replace(/(["'`]).*?\1/g, '<str>')
    .replace(/\d+/g, '<n>')
    .slice(0, 500);
}

export function describeError(error: unknown): {
  name: string;
  message: string;
  stack: string | null;
  digest: string | null;
} {
  if (error instanceof Error) {
    const digest = (error as Error & { digest?: unknown }).digest;
    return {
      name: clip(error.name || 'Error', MAX_FIELD)!,
      message: clip(error.message || '(no message)', MAX_MESSAGE)!,
      stack: clip(error.stack, MAX_STACK),
      digest: typeof digest === 'string' ? clip(digest, MAX_FIELD) : null,
    };
  }
  return {
    name: 'NonError',
    message: clip(String(error), MAX_MESSAGE)!,
    stack: null,
    digest: null,
  };
}

export function fingerprintOf(name: string, message: string, route: string | null): string {
  return createHash('sha256')
    .update(`${name}\n${normalizeMessage(message)}\n${route ?? ''}`)
    .digest('hex');
}

export function isControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === 'string' && CONTROL_FLOW.test(digest);
}

export type RecordResult = { id: string; count: number; alerted: boolean } | null;

/** Stores one occurrence. Returns null when ignored or when the database is unreachable. */
export async function recordServerError(
  error: unknown,
  context: ErrorContext = {},
  env: Env = process.env,
): Promise<RecordResult> {
  if (isControlFlow(error)) return null;
  const info = describeError(error);
  const route = clip(context.route, MAX_FIELD);
  const fingerprint = fingerprintOf(info.name, info.message, route);

  try {
    // One statement: concurrent occurrences cannot create two rows, and the
    // CTE reads the row as it was before, telling a reopened error apart.
    const rows = await prisma.$queryRaw<
      { id: string; count: number; inserted: boolean; reopened: boolean }[]
    >`
      WITH before AS (SELECT "resolvedAt" FROM error_groups WHERE fingerprint = ${fingerprint})
      INSERT INTO error_groups (id, fingerprint, name, message, stack, route, "routeType", method,
                                "lastPath", digest, count, "firstSeenAt", "lastSeenAt")
      VALUES (${randomUUID()}, ${fingerprint}, ${info.name}, ${info.message}, ${info.stack}, ${route},
              ${clip(context.routeType, MAX_FIELD)}, ${clip(context.method, 16)},
              ${stripQuery(context.path)}, ${info.digest}, 1, now(), now())
      ON CONFLICT (fingerprint) DO UPDATE SET
        count = error_groups.count + 1,
        "lastSeenAt" = now(),
        message = EXCLUDED.message,
        stack = COALESCE(EXCLUDED.stack, error_groups.stack),
        method = EXCLUDED.method,
        "lastPath" = EXCLUDED."lastPath",
        digest = EXCLUDED.digest,
        "resolvedAt" = NULL
      RETURNING id, count, (xmax = 0) AS inserted,
                COALESCE((SELECT "resolvedAt" IS NOT NULL FROM before), false) AS reopened`;
    const row = rows[0];
    if (!row) return null;

    if (Math.random() < 0.02) void pruneResolved();

    let alerted = false;
    if (row.inserted || row.reopened) {
      alerted = await sendAlert(row.id, info, route, context, row.reopened, env);
    }
    return { id: row.id, count: row.count, alerted };
  } catch (failure) {
    console.error('[errors] could not record a server error', failure);
    return null;
  }
}

function alertRecipients(env: Env): string[] {
  return (env.ERROR_ALERT_EMAIL ?? '')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);
}

async function sendAlert(
  id: string,
  info: ReturnType<typeof describeError>,
  route: string | null,
  context: ErrorContext,
  reopened: boolean,
  env: Env,
): Promise<boolean> {
  const recipients = alertRecipients(env);
  if (recipients.length === 0) return false;
  // A broken deploy can raise many new errors at once; cap the mail.
  if (!(await consume('error-alert', LIMITS.errorAlerts))) return false;

  const site = (env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  const text = [
    reopened ? 'خطایی که حل‌شده علامت خورده بود دوباره رخ داد.' : 'خطای تازه‌ای در سایت رخ داد.',
    '',
    `${info.name}: ${info.message}`,
    `مسیر: ${route ?? '—'} (${context.method ?? '—'} ${stripQuery(context.path) ?? '—'})`,
    '',
    `جزئیات: ${site}/admin/system/errors/${id}`,
  ].join('\n');

  const results = await Promise.all(
    recipients.map((to) =>
      sendEmail({ to, subject: `[bdcenter] خطای سرور: ${info.name}`.slice(0, 150), text }, env),
    ),
  );
  return results.some(Boolean);
}

async function pruneResolved() {
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await prisma.errorGroup.deleteMany({
      where: { resolvedAt: { not: null }, lastSeenAt: { lt: cutoff } },
    });
  } catch (failure) {
    console.error('[errors] prune failed', failure);
  }
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function listErrorGroups({ resolved }: { resolved: boolean }) {
  return prisma.errorGroup.findMany({
    where: { resolvedAt: resolved ? { not: null } : null },
    orderBy: { lastSeenAt: 'desc' },
    take: 200,
    select: {
      id: true,
      name: true,
      message: true,
      route: true,
      count: true,
      lastSeenAt: true,
      resolvedAt: true,
    },
  });
}

export async function countOpenErrors() {
  return prisma.errorGroup.count({ where: { resolvedAt: null } });
}

export async function getErrorGroup(id: string) {
  return prisma.errorGroup.findUnique({ where: { id } });
}

export async function setErrorResolved(id: string, resolved: boolean, actorId: string) {
  const { count } = await prisma.errorGroup.updateMany({
    where: { id },
    data: { resolvedAt: resolved ? new Date() : null },
  });
  if (count === 0) return;
  await recordAudit({
    actorId,
    action: resolved ? 'error.resolve' : 'error.reopen',
    entity: 'ErrorGroup',
    entityId: id,
  });
}
