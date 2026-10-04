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
import { formClosedMessage, formReceivedNotice } from '@/content/forms';
import { getCurrentMember } from '@/modules/members/service';
import { alertStaff, sendFormConfirmation } from '@/modules/notifications/service';

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
  const member = await getCurrentMember();
  const result = await submitForm(
    slug,
    answersFrom(formData),
    member ? { id: member.id, phone: member.phone, email: member.email } : null,
  );
  if (result.ok) {
    after(async () => {
      await alertStaff(
        'forms',
        staffAlertText.forms(result.formTitle),
        '/admin/forms',
        result.alertRecipients,
      );
      if (result.confirmTo) {
        await sendFormConfirmation({
          submissionId: result.submissionId,
          ...result.confirmTo,
          notice: formReceivedNotice(result.formTitle),
        });
      }
    });
    return { status: 'success', message: result.thankYouText || SUCCESS_MESSAGE };
  }

  const values = echo(formData);
  if (result.reason === 'invalid') {
    return { status: 'error', message: GENERIC_ERROR, errors: result.errors, values };
  }
  const message =
    result.reason === 'not-found'
      ? 'این فرم دیگر فعال نیست.'
      : result.reason === 'not-yet'
        ? formClosedMessage['not-yet']('زمان تعیین‌شده')
        : formClosedMessage[result.reason]();
  return { status: 'error', message, errors: {}, values };
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
