'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { toLatinDigits } from '@/lib/validation';
import { requireAdmin } from '@/modules/auth/service';
import {
  confirmTotpSetup,
  disableTotp,
  regenerateRecoveryCodes,
  startTotpSetup,
} from '@/modules/auth/two-factor';

export type TwoFactorState =
  { status: 'idle' } | { status: 'error'; message: string } | { status: 'codes'; codes: string[] };

const codeSchema = z.preprocess(
  (value) => (typeof value === 'string' ? toLatinDigits(value).trim() : value),
  z.string().min(6).max(40),
);

export async function startTwoFactorAction() {
  const admin = await requireAdmin();
  await startTotpSetup(admin.id);
  revalidatePath('/admin/account');
}

export async function confirmTwoFactorAction(
  _prev: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  const admin = await requireAdmin();
  const code = codeSchema.safeParse(formData.get('code'));
  const result = code.success
    ? await confirmTotpSetup(admin.id, code.data)
    : { ok: false as const };
  if (!result.ok) {
    return { status: 'error', message: 'کد درست نیست. ساعت گوشی را بررسی و کد تازه را وارد کنید.' };
  }
  // No revalidation here: refreshing would replace the form that shows the
  // recovery codes with the "enabled" view before the admin could copy them.
  return { status: 'codes', codes: result.recoveryCodes };
}

export async function regenerateCodesAction(
  _prev: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  const admin = await requireAdmin();
  const code = codeSchema.safeParse(formData.get('code'));
  const codes = code.success ? await regenerateRecoveryCodes(admin.id, code.data) : null;
  if (!codes) return { status: 'error', message: 'کد درست نیست.' };
  return { status: 'codes', codes };
}

export async function disableTwoFactorAction(
  _prev: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  const admin = await requireAdmin();
  const code = codeSchema.safeParse(formData.get('code'));
  const password = String(formData.get('password') ?? '');
  const ok = code.success && (await disableTotp(admin.id, password, code.data));
  if (!ok) return { status: 'error', message: 'رمز عبور یا کد درست نیست.' };
  revalidatePath('/admin/account');
  return { status: 'idle' };
}
