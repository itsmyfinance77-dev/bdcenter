'use server';

import { surveyCopy } from '@/content/surveys';
import { clientIp } from '@/lib/client-ip';
import { formValues, GENERIC_ERROR, RATE_LIMITED, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { consume, LIMITS } from '@/modules/ratelimit/service';
import { answerSurvey, surveyAnswerSchema } from '@/modules/surveys/service';

const refused = {
  answered: surveyCopy.answered,
  expired: surveyCopy.expired,
  'not-found': surveyCopy.notFound,
  open: surveyCopy.notFound,
} as const;

export async function answerSurveyAction(
  token: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!(await consume(`survey:ip:${await clientIp()}`, LIMITS.publicForm))) {
    return { status: 'error', message: RATE_LIMITED, errors: {}, values };
  }
  const parsed = surveyAnswerSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  const result = await answerSurvey(token.slice(0, 64), parsed.data);
  if (result === 'saved') return { status: 'success', message: surveyCopy.thanks };
  return { status: 'error', message: refused[result], errors: {}, values };
}
