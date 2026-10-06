import { afterEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { emailAvailable, sendEmail } from '@/modules/messaging/email';
import { smsSandboxEnabled } from '@/modules/messaging/sandbox';
import { kavenegar, smsIr, smsSender } from '@/modules/messaging/sms';

type Call = { url: string; init: RequestInit };

function mockFetch(body: unknown, status = 200) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(body), { status });
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('provider selection', () => {
  it('needs every setting before a provider is available', () => {
    expect(kavenegar({})).toBeNull();
    expect(smsIr({ SMSIR_API_KEY: 'k' })).toBeNull();
    expect(smsSender({ SMS_PROVIDER: 'kavenegar' })).toBeNull();
    expect(smsSender({ SMS_PROVIDER: 'unknown', KAVENEGAR_API_KEY: 'k' })).toBeNull();
    expect(smsSender({ SMS_PROVIDER: 'kavenegar', KAVENEGAR_API_KEY: 'k' })).not.toBeNull();
  });

  it('refuses the console provider in production', () => {
    expect(smsSender({ SMS_PROVIDER: 'console', NODE_ENV: 'production' })).toBeNull();
    expect(smsSender({ NODE_ENV: 'development' })).not.toBeNull();
  });

  it('allows the sandbox only in development and the plain-HTTP preview', () => {
    expect(smsSandboxEnabled({ SMS_PROVIDER: 'sandbox', NODE_ENV: 'development' })).toBe(true);
    expect(
      smsSandboxEnabled({
        SMS_PROVIDER: 'sandbox',
        NODE_ENV: 'production',
        INSECURE_HTTP_PREVIEW: '1',
      }),
    ).toBe(true);
    expect(smsSandboxEnabled({ SMS_PROVIDER: 'sandbox', NODE_ENV: 'production' })).toBe(false);
    expect(smsSandboxEnabled({ SMS_PROVIDER: 'console', NODE_ENV: 'development' })).toBe(false);
    expect(smsSender({ SMS_PROVIDER: 'sandbox', NODE_ENV: 'production' })).toBeNull();
    expect(smsSender({ SMS_PROVIDER: 'sandbox', NODE_ENV: 'development' })).not.toBeNull();
  });
});

describe('Kavenegar', () => {
  const env = { KAVENEGAR_API_KEY: 'KEY/1', KAVENEGAR_SENDER: '10004346' };

  it('sends text through sms/send with the sender line', async () => {
    const calls = mockFetch({ return: { status: 200, message: 'تایید شد' }, entries: [] });
    expect(await kavenegar(env)!.send('09120000000', 'سلام')).toBe(true);
    expect(calls[0]!.url).toBe('https://api.kavenegar.com/v1/KEY%2F1/sms/send.json');
    const body = new URLSearchParams(calls[0]!.init.body as URLSearchParams);
    expect(Object.fromEntries(body)).toEqual({
      receptor: '09120000000',
      message: 'سلام',
      sender: '10004346',
    });
  });

  it('uses verify/lookup for codes when a template is set', async () => {
    const calls = mockFetch({ return: { status: 200 } });
    const sender = kavenegar({ ...env, KAVENEGAR_OTP_TEMPLATE: 'login' })!;
    expect(await sender.sendOtp('09120000000', '123456', 'متن')).toBe(true);
    expect(calls[0]!.url).toMatch(/\/verify\/lookup\.json$/);
    expect(Object.fromEntries(new URLSearchParams(calls[0]!.init.body as URLSearchParams))).toEqual(
      { receptor: '09120000000', token: '123456', template: 'login' },
    );
  });

  it('falls back to plain text without a template, and reports refusals', async () => {
    const calls = mockFetch({ return: { status: 418, message: 'اعتبار کافی نیست' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await kavenegar(env)!.sendOtp('09120000000', '123456', 'کد: 123456')).toBe(false);
    expect(calls[0]!.url).toMatch(/\/sms\/send\.json$/);
  });
});

describe('SMS.ir', () => {
  const env = { SMSIR_API_KEY: 'secret', SMSIR_LINE_NUMBER: '30007732' };

  it('sends text through send/bulk with the API key header', async () => {
    const calls = mockFetch({ status: 1, message: 'موفق', data: {} });
    expect(await smsIr(env)!.send('09120000000', 'سلام')).toBe(true);
    expect(calls[0]!.url).toBe('https://api.sms.ir/v1/send/bulk');
    expect((calls[0]!.init.headers as Record<string, string>)['X-API-KEY']).toBe('secret');
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      lineNumber: 30007732,
      messageText: 'سلام',
      mobiles: ['09120000000'],
    });
  });

  it('uses send/verify with the template parameter for codes', async () => {
    const calls = mockFetch({ status: 1 });
    const sender = smsIr({ ...env, SMSIR_OTP_TEMPLATE_ID: '123', SMSIR_OTP_PARAM: 'Code' })!;
    expect(await sender.sendOtp('09120000000', '654321', 'متن')).toBe(true);
    expect(calls[0]!.url).toBe('https://api.sms.ir/v1/send/verify');
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      mobile: '09120000000',
      templateId: 123,
      parameters: [{ name: 'Code', value: '654321' }],
    });
  });

  it('turns HTTP errors and network failures into false', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch({ status: 0, message: 'کلید نامعتبر' }, 401);
    expect(await smsIr(env)!.send('09120000000', 'x')).toBe(false);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network down');
      }),
    );
    expect(await smsIr(env)!.send('09120000000', 'x')).toBe(false);
  });
});

describe('email', () => {
  it('logs in development and sends nothing in production without SMTP', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const message = { to: 'a@b.ir', subject: 's', text: 't' };
    expect(await sendEmail(message, { NODE_ENV: 'development' })).toBe(true);
    expect(await sendEmail(message, { NODE_ENV: 'production' })).toBe(false);
    expect(emailAvailable({ NODE_ENV: 'production' })).toBe(false);
    expect(emailAvailable({ NODE_ENV: 'production', SMTP_URL: 'smtp://x' })).toBe(true);
  });

  it('needs a sender address when SMTP is configured', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(
      await sendEmail(
        { to: 'a@b.ir', subject: 's', text: 't' },
        { SMTP_URL: 'smtp://127.0.0.1:1' },
      ),
    ).toBe(false);
  });

  it('only relaxes TLS certificate checking when SMTP_ALLOW_SELF_SIGNED is set', async () => {
    const sendMail = vi.fn(async () => undefined);
    const createTransport = vi
      .spyOn(nodemailer, 'createTransport')
      .mockReturnValue({ sendMail } as unknown as ReturnType<typeof nodemailer.createTransport>);
    const message = { to: 'a@b.ir', subject: 's', text: 't' };
    const from = 'noreply@ccinno.center';

    await sendEmail(message, { SMTP_URL: 'smtps://trusted.example.com:465', MAIL_FROM: from });
    expect(createTransport.mock.calls.at(-1)?.[0]).toMatchObject({ tls: undefined });

    await sendEmail(message, {
      SMTP_URL: 'smtps://self-signed.example.com:465',
      MAIL_FROM: from,
      SMTP_ALLOW_SELF_SIGNED: '1',
    });
    expect(createTransport.mock.calls.at(-1)?.[0]).toMatchObject({
      tls: { rejectUnauthorized: false },
    });
  });
});
