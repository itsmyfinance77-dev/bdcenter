'use server';

import { formValues, GENERIC_ERROR, isSpam, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { contactMessageSchema, createContactMessage } from '@/modules/contact/service';

const SENT = 'پیام شما ارسال شد. سپاس از تماس شما.';

export async function sendContactMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  if (isSpam(formData)) return { status: 'success', message: SENT };

  const values = formValues(formData);
  const parsed = contactMessageSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }

  await createContactMessage(parsed.data);
  return { status: 'success', message: SENT };
}
