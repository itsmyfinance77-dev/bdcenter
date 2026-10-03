'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { requireAdmin } from '@/modules/auth/service';
import {
  deletePage,
  pageInputSchema,
  restorePageRevision,
  savePage,
} from '@/modules/pages/service';

export async function savePageAction(
  slug: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const values = formValues(formData);
  const parsed = pageInputSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  const result = await savePage(slug, parsed.data, admin.id);
  if (!result.ok) {
    return { status: 'error', message: GENERIC_ERROR, errors: result.errors, values };
  }
  // Pages also show up in the footer and on the home page.
  revalidatePath('/', 'layout');
  redirect(`/admin/pages/${encodeURIComponent(result.slug)}?saved=1`);
}

export async function deletePageAction(slug: string) {
  const admin = await requireAdmin();
  await deletePage(slug, admin.id);
  revalidatePath('/', 'layout');
  redirect('/admin/pages');
}

export async function restoreRevisionAction(slug: string, revisionId: string) {
  const admin = await requireAdmin();
  const restored = await restorePageRevision(slug, revisionId, admin.id);
  revalidatePath('/', 'layout');
  redirect(`/admin/pages/${encodeURIComponent(slug)}?${restored ? 'restored=1' : 'saved=0'}`);
}
