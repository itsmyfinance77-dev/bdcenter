import type { SmsSender } from './sms';

/**
 * SMS sandbox for testers (SMS_PROVIDER="sandbox"): nothing is sent; each
 * message is stored and listed in the admin panel («صندوق پیامک آزمایشی»), so
 * member sign-in and status notices can be tested without an SMS provider.
 *
 * Allowed in development and in the plain-HTTP preview build
 * (INSECURE_HTTP_PREVIEW=1, `npm run preview`), never on the real deployment:
 * anyone who can read the inbox could sign in as any member.
 */

type Env = Record<string, string | undefined>;

const KEEP = 300;

export function smsSandboxEnabled(env: Env = process.env): boolean {
  if (env.SMS_PROVIDER?.trim() !== 'sandbox') return false;
  return env.NODE_ENV !== 'production' || env.INSECURE_HTTP_PREVIEW === '1';
}

async function db() {
  return (await import('@/lib/prisma')).prisma;
}

async function store(phone: string, text: string, code: string | null): Promise<boolean> {
  try {
    const prisma = await db();
    await prisma.sandboxSms.create({ data: { phone, text, code } });
    const old = await prisma.sandboxSms.findMany({
      orderBy: { createdAt: 'desc' },
      skip: KEEP,
      select: { id: true },
    });
    if (old.length > 0) {
      await prisma.sandboxSms.deleteMany({ where: { id: { in: old.map((row) => row.id) } } });
    }
    console.info(`[sms:sandbox] to ${phone}: ${text}`);
    return true;
  } catch (error) {
    console.error('[sms:sandbox] could not store the message', error);
    return false;
  }
}

export function sandboxSms(env: Env): SmsSender | null {
  if (!smsSandboxEnabled(env)) return null;
  return {
    send: (phone, text) => store(phone, text, null),
    sendOtp: (phone, code, fallbackText) => store(phone, fallbackText, code),
  };
}

export type SandboxMessage = {
  id: string;
  phone: string;
  text: string;
  code: string | null;
  createdAt: Date;
};

/** Newest first; `phone` (normalized 09…) narrows the list to one number. */
export async function listSandboxSms(phone?: string, limit = 100): Promise<SandboxMessage[]> {
  return (await db()).sandboxSms.findMany({
    where: phone ? { phone } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function clearSandboxSms(): Promise<void> {
  await (await db()).sandboxSms.deleteMany();
}
