'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { FormState } from '@/lib/form-state';
import { login } from '@/modules/auth/service';

/** Only same-site admin paths are allowed as a post-login destination. */
function safeNext(value: FormDataEntryValue | null): string {
  return typeof value === 'string' && /^\/admin(\/[\w\-/]*)?$/.test(value) ? value : '/admin';
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const headerList = await headers();
  const clientIp = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';

  const result = await login(email, password, clientIp);
  if (!result.ok) {
    const message =
      result.reason === 'throttled'
        ? 'تعداد تلاش‌های ناموفق زیاد است. ۱۵ دقیقه دیگر دوباره تلاش کنید.'
        : 'ایمیل یا رمز عبور نادرست است.';
    return { status: 'error', message, errors: {}, values: { email } };
  }
  redirect(safeNext(formData.get('next')));
}
