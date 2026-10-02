'use server';

import { revalidatePath } from 'next/cache';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { requireAdmin } from '@/modules/auth/service';
import { resetTotpFor } from '@/modules/auth/two-factor';
import {
  createAdmin,
  newAdminSchema,
  resetAdminPassword,
  resetPasswordSchema,
  setAdminActive,
} from '@/modules/auth/users';

export async function createAdminAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin('ADMIN');
  const values = formValues(formData);
  const parsed = newAdminSchema.safeParse(values);
  // Never echo the password back into the form.
  const safeValues = { ...values };
  delete safeValues.password;
  if (!parsed.success) {
    return {
      status: 'error',
      message: GENERIC_ERROR,
      errors: fieldErrors(parsed.error),
      values: safeValues,
    };
  }

  const result = await createAdmin(parsed.data, admin.id);
  if (!result.ok) {
    return { status: 'error', message: result.error, errors: {}, values: safeValues };
  }
  revalidatePath('/admin/users');
  return { status: 'success', message: `حساب ${parsed.data.email} ساخته شد.` };
}

export async function setAdminActiveAction(userId: string, isActive: boolean) {
  const admin = await requireAdmin('ADMIN');
  await setAdminActive(userId, isActive, admin);
  revalidatePath('/admin/users');
}

export async function resetTwoFactorAction(userId: string) {
  const admin = await requireAdmin('ADMIN');
  await resetTotpFor(userId, admin);
  revalidatePath('/admin/users');
}

export type ResetPasswordState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; message: string; generated: string | null };

export async function resetPasswordAction(
  userId: string,
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const admin = await requireAdmin('ADMIN');
  const parsed = resetPasswordSchema.safeParse({ password: formData.get('password') ?? '' });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }
  const result = await resetAdminPassword(userId, parsed.data.password, admin);
  if (!result.ok) return { status: 'error', message: result.error };
  // No revalidatePath: re-rendering the list could drop the one-time password
  // from the screen before it was copied.
  return {
    status: 'success',
    message: result.generated
      ? 'رمز تازه ساخته شد. آن را همین حالا یادداشت کنید و به‌صورت امن به کاربر بدهید؛ دوباره نمایش داده نمی‌شود.'
      : 'رمز تازه ثبت شد. آن را به‌صورت امن به کاربر بدهید.',
    generated: result.generated,
  };
}
