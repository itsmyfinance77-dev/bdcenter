'use server';

import {
  formValues,
  GENERIC_ERROR,
  isSpam,
  SUCCESS_MESSAGE,
  type FormState,
} from '@/lib/form-state';
import { submitForm } from '@/modules/forms/service';

export async function submitDynamicForm(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (isSpam(formData)) return { status: 'success', message: SUCCESS_MESSAGE };

  const result = await submitForm(slug, Object.fromEntries(formData));
  if (result.ok) return { status: 'success', message: SUCCESS_MESSAGE };

  const values = formValues(formData);
  if (result.reason === 'not-found') {
    return { status: 'error', message: 'این فرم دیگر فعال نیست.', errors: {}, values };
  }
  return { status: 'error', message: GENERIC_ERROR, errors: result.errors, values };
}
