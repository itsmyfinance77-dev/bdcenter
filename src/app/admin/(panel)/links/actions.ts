'use server';

import { revalidatePath } from 'next/cache';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { requireAdmin } from '@/modules/auth/service';
import { deleteLink, linkInputSchema, saveLink } from '@/modules/links/service';

export async function saveLinkAction(
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const values = formValues(formData);
  const parsed = linkInputSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  await saveLink(id, parsed.data, admin.id);
  revalidatePath('/', 'layout');
  // A new-link form starts empty again; an edited row keeps its values.
  return { status: 'success', message: id ? 'ذخیره شد.' : 'پیوند اضافه شد.' };
}

export async function deleteLinkAction(id: string) {
  const admin = await requireAdmin();
  await deleteLink(id, admin.id);
  revalidatePath('/', 'layout');
}
