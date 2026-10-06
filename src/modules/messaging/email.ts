import nodemailer from 'nodemailer';

/**
 * Outgoing email over SMTP. Configure SMTP_URL (e.g.
 * `smtps://user:password@mail.example.com:465`) and MAIL_FROM. Without
 * SMTP_URL, development prints messages to the server log and production
 * sends nothing.
 *
 * `SMTP_ALLOW_SELF_SIGNED=1` accepts a self-signed/untrusted TLS certificate
 * on the SMTP server — some budget shared hosts (cPanel mail on a plan that
 * never got a real certificate) only offer that. Off by default; only turn it
 * on for a provider you already trust, since it also stops catching a
 * man-in-the-middle on that connection.
 */

export type EmailMessage = { to: string; subject: string; text: string };

type Env = Record<string, string | undefined>;

let cached: {
  url: string;
  allowSelfSigned: boolean;
  transport: ReturnType<typeof nodemailer.createTransport>;
} | null = null;

function transport(url: string, allowSelfSigned: boolean) {
  if (cached?.url !== url || cached.allowSelfSigned !== allowSelfSigned) {
    cached = {
      url,
      allowSelfSigned,
      transport: nodemailer.createTransport({
        url,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
        tls: allowSelfSigned ? { rejectUnauthorized: false } : undefined,
      }),
    };
  }
  return cached.transport;
}

/** True when email can actually be sent (or logged, in development). */
export function emailAvailable(env: Env = process.env): boolean {
  return Boolean(env.SMTP_URL?.trim()) || env.NODE_ENV !== 'production';
}

/** Sends one message; never throws. Returns whether it was handed to the mail server. */
export async function sendEmail(message: EmailMessage, env: Env = process.env): Promise<boolean> {
  const url = env.SMTP_URL?.trim();
  if (!url) {
    if (env.NODE_ENV === 'production') return false;
    console.info(`[email:console] to ${message.to}: ${message.subject}\n${message.text}`);
    return true;
  }
  const from = env.MAIL_FROM?.trim();
  if (!from) {
    console.error('[email] MAIL_FROM is not set');
    return false;
  }
  try {
    await transport(url, env.SMTP_ALLOW_SELF_SIGNED === '1').sendMail({ from, ...message });
    return true;
  } catch (error) {
    console.error('[email] send failed', error);
    return false;
  }
}
