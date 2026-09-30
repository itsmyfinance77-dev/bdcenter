'use server';

import type { FormState } from '@/lib/form-state';
import { reissueAdminSession, requireAdmin } from '@/modules/auth/service';
import { changeOwnPassword, passwordSchema } from '@/modules/auth/users';

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const current = String(formData.get('current') ?? '');
  const next = passwordSchema.safeParse(formData.get('next'));
  if (!next.success) {
    return {
      status: 'error',
      message: 'رمز عبور جدید معتبر نیست.',
      errors: { next: next.error.issues[0]?.message ?? '' },
      values: {},
    };
  }

  const result = await changeOwnPassword(admin, current, next.data);
  if (!result.ok) {
    return {
      status: 'error',
      message: result.error,
      errors: { current: result.error },
      values: {},
    };
  }
  await reissueAdminSession(admin.id);
  return { status: 'success', message: 'رمز عبور تغییر کرد. نشست‌های دیگر شما بسته شد.' };
}
