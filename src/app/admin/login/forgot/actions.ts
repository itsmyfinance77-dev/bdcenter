'use server';

import { headers } from 'next/headers';
import { after } from 'next/server';
import { clientIp } from '@/lib/client-ip';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { servedOverHttps } from '@/lib/https';
import { fieldErrors } from '@/lib/validation';
import {
  completePasswordReset,
  forgotSchema,
  newPasswordSchema,
  requestPasswordReset,
} from '@/modules/auth/password-reset';

/** Where the emailed link should point: the configured site, or the address in use (dev, preview). */
async function siteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (servedOverHttps() && configured) return configured;
  const host = (await headers()).get('host');
  return host ? `http://${host}` : (configured ?? 'http://localhost:3010');
}

export async function forgotAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = forgotSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  const result = await requestPasswordReset(
    parsed.data.email,
    await clientIp(),
    await siteUrl(),
    // The link is made and mailed after the answer, so timing reveals nothing.
    (task) => after(task),
  );
  if (result === 'throttled') {
    return {
      status: 'error',
      message: 'درخواست‌ها زیاد بوده است. یک ساعت دیگر دوباره تلاش کنید.',
      errors: {},
      values,
    };
  }
  if (result === 'unavailable') {
    return {
      status: 'error',
      message:
        'ارسال ایمیل در این سایت فعال نیست. از یک «مدیر کل» بخواهید برایتان رمز تازه تعیین کند.',
      errors: {},
      values,
    };
  }
  return {
    status: 'success',
    message:
      'اگر این ایمیل در پنل ثبت شده باشد، پیوند انتخاب رمز تازه تا چند دقیقهٔ دیگر به آن فرستاده می‌شود. پوشهٔ هرزنامه را هم ببینید. اگر نامه‌ای نرسید، از یک «مدیر کل» کمک بگیرید.',
  };
}

export async function resetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = newPasswordSchema.safeParse(values);
  // Nothing is echoed back: passwords are retyped and the token is in the page already.
  const shown = {};
  if (!parsed.success) {
    return {
      status: 'error',
      message: GENERIC_ERROR,
      errors: fieldErrors(parsed.error),
      values: shown,
    };
  }
  if (!(await completePasswordReset(parsed.data.token, parsed.data.password))) {
    return {
      status: 'error',
      message: 'این پیوند دیگر معتبر نیست. دوباره «رمز را فراموش کرده‌ام» را بزنید.',
      errors: {},
      values: shown,
    };
  }
  return { status: 'success', message: 'رمز تازه ثبت شد. اکنون با آن وارد پنل شوید.' };
}
