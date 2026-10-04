'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { z } from 'zod';
import { formatNumber } from '@/lib/format';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { requireAdmin } from '@/modules/auth/service';
import {
  addSubmissionNote,
  assignSubmission,
  assigneeSchema,
  duplicateForm,
  formDefinitionInputSchema,
  noteSchema,
  saveFormDefinition,
  setSubmissionStatus,
  SUBMISSION_STATUSES,
} from '@/modules/forms/service';
import { notifyFormStatus } from '@/modules/notifications/service';

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

function revalidateSubmission(formId: string, id: string) {
  revalidatePath(`/admin/forms/${formId}`);
  revalidatePath(`/admin/forms/${formId}/submissions/${id}`);
}

export async function setSubmissionStatusAction(id: string, formId: string, formData: FormData) {
  const admin = await requireAdmin();
  const status = z.enum(SUBMISSION_STATUSES).parse(formData.get('status'));
  const changed = await setSubmissionStatus(formId, id, status, admin.id);
  if (changed && formData.get('notify') === 'on') {
    // After the response: a slow SMS provider must not hold up the panel.
    after(() => notifyFormStatus(id, status));
  }
  revalidateSubmission(formId, id);
}

export async function assignSubmissionAction(
  id: string,
  formId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = assigneeSchema.safeParse(formData.get('assignee') ?? '');
  const result = parsed.success
    ? await assignSubmission(formId, id, parsed.data || null, admin.id)
    : { ok: false as const, error: 'مسئول پیگیری معتبر نیست.' };
  if (!result.ok) return { status: 'error', message: result.error, errors: {}, values: {} };
  revalidateSubmission(formId, id);
  return { status: 'success', message: 'مسئول پیگیری ثبت شد.' };
}

export async function addSubmissionNoteAction(
  id: string,
  formId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const values = formValues(formData);
  const parsed = noteSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  if (!(await addSubmissionNote(formId, id, parsed.data.body, admin.id))) {
    return { status: 'error', message: 'درخواست پیدا نشد.', errors: {}, values };
  }
  revalidateSubmission(formId, id);
  return { status: 'success', message: 'یادداشت ثبت شد.' };
}

export async function duplicateFormAction(id: string) {
  const admin = await requireAdmin('ADMIN');
  const copyId = await duplicateForm(id, admin.id);
  revalidatePath('/admin/forms');
  redirect(copyId ? `/admin/forms/${copyId}/edit?saved=1` : '/admin/forms');
}
