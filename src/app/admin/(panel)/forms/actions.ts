'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formatNumber } from '@/lib/format';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { requireAdmin } from '@/modules/auth/service';
import { requestStatusSchema } from '@/modules/consulting/service';
import {
  duplicateForm,
  formDefinitionInputSchema,
  saveFormDefinition,
  setSubmissionStatus,
} from '@/modules/forms/service';

function parseFields(raw: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(typeof raw === 'string' ? raw : '[]');
  } catch {
    return [];
  }
}

export async function saveFormAction(
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin('ADMIN');
  const values = formValues(formData);
  const parsed = formDefinitionInputSchema.safeParse({
    ...values,
    fields: parseFields(formData.get('fields')),
  });
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    // Point field-level problems at the row: "فیلد ۳: ..."
    const fieldIssue = parsed.error.issues.find(
      (issue) => issue.path[0] === 'fields' && typeof issue.path[1] === 'number',
    );
    if (fieldIssue) {
      errors.fields = `فیلد ${formatNumber(Number(fieldIssue.path[1]) + 1)}: ${fieldIssue.message}`;
    }
    return { status: 'error', message: GENERIC_ERROR, errors, values };
  }

  const result = await saveFormDefinition(id, parsed.data, admin.id);
  if (!result.ok) {
    return { status: 'error', message: GENERIC_ERROR, errors: result.errors, values };
  }
  revalidatePath('/forms', 'layout');
  redirect(`/admin/forms/${result.id}/edit?saved=1`);
}

export async function setSubmissionStatusAction(id: string, formId: string, formData: FormData) {
  const admin = await requireAdmin();
  const status = requestStatusSchema.parse(formData.get('status'));
  await setSubmissionStatus(id, status, admin.id);
  revalidatePath(`/admin/forms/${formId}`);
}

export async function duplicateFormAction(id: string) {
  const admin = await requireAdmin('ADMIN');
  const copyId = await duplicateForm(id, admin.id);
  revalidatePath('/admin/forms');
  redirect(copyId ? `/admin/forms/${copyId}/edit?saved=1` : '/admin/forms');
}
