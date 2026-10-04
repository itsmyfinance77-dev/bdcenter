'use server';

import { clientIp } from '@/lib/client-ip';
import {
  formValues,
  GENERIC_ERROR,
  isSpam,
  RATE_LIMITED,
  SUCCESS_MESSAGE,
  type FormState,
} from '@/lib/form-state';
import { answersFrom } from '@/modules/forms/fields';
import { submitForm } from '@/modules/forms/service';
import { consume, LIMITS } from '@/modules/ratelimit/service';
import { after } from 'next/server';
import { staffAlertText } from '@/content/admin';
import { alertStaff } from '@/modules/notifications/service';

export async function submitDynamicForm(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (isSpam(formData)) return { status: 'success', message: SUCCESS_MESSAGE };

  // Checked before the submission is parsed, since that already stores uploads.
  if (!(await consume(`form:ip:${await clientIp()}`, LIMITS.publicForm))) {
    return { status: 'error', message: RATE_LIMITED, errors: {}, values: formValues(formData) };
  }
  const result = await submitForm(slug, answersFrom(formData));
  if (result.ok) {
    after(() => alertStaff('forms', staffAlertText.forms(result.formTitle), '/admin/forms'));
    return { status: 'success', message: SUCCESS_MESSAGE };
  }

  const values = echo(formData);
  if (result.reason === 'not-found') {
    return { status: 'error', message: 'این فرم دیگر فعال نیست.', errors: {}, values };
  }
  return { status: 'error', message: GENERIC_ERROR, errors: result.errors, values };
}

/**
 * What was sent, for showing the form again after an error. Boxes ticked
 * together (multi-choice) come back joined by new lines.
 */
function echo(formData: FormData): Record<string, string> {
  const values = formValues(formData);
  for (const [key, value] of Object.entries(answersFrom(formData))) {
    if (Array.isArray(value)) {
      values[key] = value.filter((item) => typeof item === 'string').join('\n');
    }
  }
  return values;
}
