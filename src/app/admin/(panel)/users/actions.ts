'use server';

import { revalidatePath } from 'next/cache';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { requireAdmin } from '@/modules/auth/service';
import { createAdmin, newAdminSchema, setAdminActive } from '@/modules/auth/users';

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
