'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { requireAdmin } from '@/modules/auth/service';
import { articleInputSchema, deleteArticle, saveArticle } from '@/modules/content/service';

export async function saveArticleAction(
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const values = formValues(formData);
  const parsed = articleInputSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }

  const result = await saveArticle(id, parsed.data, admin.id);
  if (!result.ok) {
    return { status: 'error', message: GENERIC_ERROR, errors: result.errors, values };
  }
  revalidatePath('/', 'layout');
  redirect(`/admin/articles/${result.id}?saved=1`);
}

export async function deleteArticleAction(id: string) {
  const admin = await requireAdmin();
  await deleteArticle(id, admin.id);
  revalidatePath('/', 'layout');
  redirect('/admin/articles');
}
