'use server';

import { revalidatePath } from 'next/cache';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { decodeParam } from '@/lib/params';
import { fieldErrors } from '@/lib/validation';
import { requireAdmin } from '@/modules/auth/service';
import { saveServiceTile, serviceInputSchema } from '@/modules/services/service';

export async function saveServiceAction(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const values = formValues(formData);
  const parsed = serviceInputSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  if (!(await saveServiceTile(decodeParam(slug), parsed.data, admin.id))) {
    return { status: 'error', message: 'این خدمت پیدا نشد.', errors: {}, values };
  }
  revalidatePath('/', 'layout');
  return { status: 'success', message: 'ذخیره شد و در سایت نمایش داده می‌شود.' };
}
