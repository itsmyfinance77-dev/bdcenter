'use server';

import { redirect } from 'next/navigation';
import { clientIp } from '@/lib/client-ip';
import { fieldErrors } from '@/lib/validation';
import {
  phoneSchema,
  requestOtp,
  safeMemberNext,
  verifyOtp,
  verifySchema,
} from '@/modules/members/service';

export type LoginState = {
  step: 'phone' | 'code';
  phone: string;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
};

/** Step 1 sends a code; step 2 checks it. A hidden `step` input picks which. */
export async function memberLoginAction(prev: LoginState, formData: FormData): Promise<LoginState> {
  const step = formData.get('step') === 'code' ? 'code' : 'phone';
  const resend = formData.get('resend') === '1';

  if (step === 'phone' || resend) {
    const parsed = phoneSchema.safeParse({ phone: formData.get('phone') });
    if (!parsed.success) {
      return {
        step: 'phone',
        phone: String(formData.get('phone') ?? ''),
        errors: fieldErrors(parsed.error),
      };
    }
    const result = await requestOtp(parsed.data.phone, await clientIp());
    if (!result.ok)
      return { ...prev, phone: parsed.data.phone, error: result.error, message: undefined };
    return { step: 'code', phone: parsed.data.phone, message: 'کد ورود پیامک شد.' };
  }

  const parsed = verifySchema.safeParse({
    phone: formData.get('phone'),
    code: formData.get('code'),
  });
  if (!parsed.success) {
    return { step: 'code', phone: prev.phone, errors: fieldErrors(parsed.error) };
  }
  const result = await verifyOtp(parsed.data.phone, parsed.data.code);
  if (!result.ok) {
    return result.expired
      ? { step: 'phone', phone: parsed.data.phone, error: result.error }
      : { step: 'code', phone: parsed.data.phone, error: result.error };
  }

  const next = safeMemberNext(formData.get('next'));
  redirect(result.needsProfile ? `/account?welcome=1&next=${encodeURIComponent(next)}` : next);
}
