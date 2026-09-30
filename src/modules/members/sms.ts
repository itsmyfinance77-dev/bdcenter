import 'server-only';

/**
 * Outgoing SMS, behind one small interface so the provider can be chosen
 * later (OQ-BD-11) without touching the sign-in flow. Pick one with
 * SMS_PROVIDER; a real provider is a new entry in `providers`.
 */
export type SmsSender = { send(phone: string, text: string): Promise<boolean> };

const providers: Record<string, () => SmsSender | null> = {
  /** Development only: prints the message to the server log instead of sending it. */
  console: () =>
    process.env.NODE_ENV === 'production'
      ? null
      : {
          async send(phone, text) {
            console.info(`[sms:console] to ${phone}: ${text}`);
            return true;
          },
        },
};

/** The configured sender, or null when SMS is not available in this environment. */
export function smsSender(): SmsSender | null {
  const name = process.env.SMS_PROVIDER?.trim() || 'console';
  return providers[name]?.() ?? null;
}
