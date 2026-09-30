'use server';

import {
  formValues,
  GENERIC_ERROR,
  isSpam,
  SUCCESS_MESSAGE,
  type FormState,
} from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { consultingRequestSchema, createConsultingRequest } from '@/modules/consulting/service';

export async function submitConsultingRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (isSpam(formData)) return { status: 'success', message: SUCCESS_MESSAGE };

  const values = formValues(formData);
  const parsed = consultingRequestSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }

  await createConsultingRequest(parsed.data);
  return { status: 'success', message: SUCCESS_MESSAGE };
}
