/**
 * Outgoing SMS behind one small interface, so the provider can be chosen
 * (OQ-BD-11) without touching the sign-in or notification code. Pick one with
 * SMS_PROVIDER; each adapter reads its own settings from the environment and
 * is unavailable (null) until they are all set.
 *
 * Iranian operators do not deliver ordinary line messages to numbers that
 * blocked advertising SMS, so sign-in codes go through each provider's
 * "verify" template API when a template is configured.
 */

import { sandboxSms } from './sandbox';

export type SmsSender = {
  /** Sends a sign-in code; uses the provider's OTP template when one is set. */
  sendOtp(phone: string, code: string, fallbackText: string): Promise<boolean>;
  /** Sends a free-text message (status notifications). */
  send(phone: string, text: string): Promise<boolean>;
};

type Env = Record<string, string | undefined>;

const TIMEOUT_MS = 10_000;

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { ok: response.ok, json: (await response.json().catch(() => null)) as unknown };
}

async function postForm(url: string, fields: Record<string, string>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: new URLSearchParams(fields),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { ok: response.ok, json: (await response.json().catch(() => null)) as unknown };
}

/** Never lets a provider error or timeout escape: callers only need "sent or not". */
function guarded(provider: string, send: () => Promise<boolean>): Promise<boolean> {
  return send().catch((error: unknown) => {
    console.error(`[sms:${provider}] request failed`, error);
    return false;
  });
}

/** Kavenegar (kavenegar.com): `sms/send` for text, `verify/lookup` for OTP templates. */
export function kavenegar(env: Env): SmsSender | null {
  const apiKey = env.KAVENEGAR_API_KEY?.trim();
  if (!apiKey) return null;
  // KAVENEGAR_API_URL is for tests (a local fake) or an outbound proxy; normally unset.
  const api = (env.KAVENEGAR_API_URL?.trim() || 'https://api.kavenegar.com').replace(/\/$/, '');
  const base = `${api}/v1/${encodeURIComponent(apiKey)}`;
  const succeeded = (json: unknown) =>
    (json as { return?: { status?: number } } | null)?.return?.status === 200;
  const logFailure = (json: unknown) => {
    const result = (json as { return?: { status?: number; message?: string } } | null)?.return;
    console.error(`[sms:kavenegar] refused: ${result?.status ?? '?'} ${result?.message ?? ''}`);
  };

  const sendText = (phone: string, text: string) =>
    guarded('kavenegar', async () => {
      const fields: Record<string, string> = { receptor: phone, message: text };
      if (env.KAVENEGAR_SENDER?.trim()) fields.sender = env.KAVENEGAR_SENDER.trim();
      const { json } = await postForm(`${base}/sms/send.json`, fields);
      if (!succeeded(json)) logFailure(json);
      return succeeded(json);
    });

  return {
    send: sendText,
    sendOtp(phone, code, fallbackText) {
      const template = env.KAVENEGAR_OTP_TEMPLATE?.trim();
      if (!template) return sendText(phone, fallbackText);
      return guarded('kavenegar', async () => {
        const { json } = await postForm(`${base}/verify/lookup.json`, {
          receptor: phone,
          token: code,
          template,
        });
        if (!succeeded(json)) logFailure(json);
        return succeeded(json);
      });
    },
  };
}

/** SMS.ir (sms.ir, API v1): `send/bulk` for text, `send/verify` for OTP templates. */
export function smsIr(env: Env): SmsSender | null {
  const apiKey = env.SMSIR_API_KEY?.trim();
  const lineNumber = env.SMSIR_LINE_NUMBER?.trim();
  if (!apiKey || !lineNumber) return null;
  const headers = { 'X-API-KEY': apiKey };
  const succeeded = (json: unknown) => (json as { status?: number } | null)?.status === 1;
  const logFailure = (json: unknown) => {
    const result = json as { status?: number; message?: string } | null;
    console.error(`[sms:smsir] refused: ${result?.status ?? '?'} ${result?.message ?? ''}`);
  };

  const sendText = (phone: string, text: string) =>
    guarded('smsir', async () => {
      const { json } = await postJson(
        'https://api.sms.ir/v1/send/bulk',
        { lineNumber: Number(lineNumber), messageText: text, mobiles: [phone] },
        headers,
      );
      if (!succeeded(json)) logFailure(json);
      return succeeded(json);
    });

  return {
    send: sendText,
    sendOtp(phone, code, fallbackText) {
      const templateId = Number(env.SMSIR_OTP_TEMPLATE_ID?.trim());
      if (!templateId) return sendText(phone, fallbackText);
      return guarded('smsir', async () => {
        const { json } = await postJson(
          'https://api.sms.ir/v1/send/verify',
          {
            mobile: phone,
            templateId,
            parameters: [{ name: env.SMSIR_OTP_PARAM?.trim() || 'CODE', value: code }],
          },
          headers,
        );
        if (!succeeded(json)) logFailure(json);
        return succeeded(json);
      });
    },
  };
}

/** Development only: prints messages to the server log instead of sending them. */
export function consoleSms(env: Env): SmsSender | null {
  if (env.NODE_ENV === 'production') return null;
  return {
    async send(phone, text) {
      console.info(`[sms:console] to ${phone}: ${text}`);
      return true;
    },
    async sendOtp(phone, _code, fallbackText) {
      console.info(`[sms:console] to ${phone}: ${fallbackText}`);
      return true;
    },
  };
}

const providers: Record<string, (env: Env) => SmsSender | null> = {
  console: consoleSms,
  sandbox: sandboxSms,
  kavenegar,
  smsir: smsIr,
};

/** The configured sender, or null when SMS is not available in this environment. */
export function smsSender(env: Env = process.env): SmsSender | null {
  const name = env.SMS_PROVIDER?.trim() || 'console';
  return providers[name]?.(env) ?? null;
}
