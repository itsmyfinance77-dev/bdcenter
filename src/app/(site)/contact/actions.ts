'use server';

import { clientIp } from '@/lib/client-ip';
import { formValues, GENERIC_ERROR, isSpam, RATE_LIMITED, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { contactMessageSchema, createContactMessage } from '@/modules/contact/service';
import { consume, LIMITS } from '@/modules/ratelimit/service';
import { after } from 'next/server';
import { staffAlertText } from '@/content/admin';
import { alertStaff } from '@/modules/notifications/service';

const SENT = 'پیام شما ارسال شد. سپاس از تماس شما.';

export async function sendContactMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  if (isSpam(formData)) return { status: 'success', message: SENT };

  const values = formValues(formData);
  if (!(await consume(`contact:ip:${await clientIp()}`, LIMITS.publicForm))) {
    return { status: 'error', message: RATE_LIMITED, errors: {}, values };
  }
  const parsed = contactMessageSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }

  await createContactMessage(parsed.data);
  after(() =>
    alertStaff('contact', staffAlertText.contact(parsed.data.fullName), '/admin/messages'),
  );
  return { status: 'success', message: SENT };
}
