import nodemailer from 'nodemailer';

/**
 * Outgoing email over SMTP. Configure SMTP_URL (e.g.
 * `smtps://user:password@mail.example.com:465`) and MAIL_FROM. Without
 * SMTP_URL, development prints messages to the server log and production
 * sends nothing.
 */

export type EmailMessage = { to: string; subject: string; text: string };

type Env = Record<string, string | undefined>;

let cached: { url: string; transport: ReturnType<typeof nodemailer.createTransport> } | null = null;

function transport(url: string) {
  if (cached?.url !== url) {
    cached = {
      url,
      transport: nodemailer.createTransport({
        url,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
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
    await transport(url).sendMail({ from, ...message });
    return true;
  } catch (error) {
    console.error('[email] send failed', error);
    return false;
  }
}
