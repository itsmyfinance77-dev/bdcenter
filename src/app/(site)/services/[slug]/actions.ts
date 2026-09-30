'use server';

import { consultingCopy } from '@/content/members';
import { clientIp } from '@/lib/client-ip';
import {
  formValues,
  GENERIC_ERROR,
  isSpam,
  RATE_LIMITED,
  SUCCESS_MESSAGE,
  type FormState,
} from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { consultingRequestSchema, createConsultingRequest } from '@/modules/consulting/service';
import { getCurrentMember } from '@/modules/members/service';
import { consume, LIMITS } from '@/modules/ratelimit/service';

export async function submitConsultingRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (isSpam(formData)) return { status: 'success', message: SUCCESS_MESSAGE };

  const values = formValues(formData);
  if (!(await consume(`consulting:ip:${await clientIp()}`, LIMITS.publicForm))) {
    return { status: 'error', message: RATE_LIMITED, errors: {}, values };
  }
  const parsed = consultingRequestSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }

  const member = await getCurrentMember();
  await createConsultingRequest(parsed.data, member?.id ?? null);
  return {
    status: 'success',
    message: member ? `${SUCCESS_MESSAGE} ${consultingCopy.trackInAccount}` : SUCCESS_MESSAGE,
  };
}
