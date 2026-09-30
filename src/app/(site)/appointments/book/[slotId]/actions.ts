'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { appointmentsCopy } from '@/content/appointments';
import { clientIp } from '@/lib/client-ip';
import { formValues, GENERIC_ERROR, RATE_LIMITED, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { bookingInputSchema, bookSlot } from '@/modules/appointments/service';
import { requireMember } from '@/modules/members/service';
import { notifyBooking } from '@/modules/notifications/service';
import { consume, LIMITS } from '@/modules/ratelimit/service';

export async function bookSlotAction(
  slotId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const member = await requireMember(`/appointments/book/${slotId}`);
  const values = formValues(formData);
  if (!(await consume(`booking:ip:${await clientIp()}`, LIMITS.publicForm))) {
    return { status: 'error', message: RATE_LIMITED, errors: {}, values };
  }
  const parsed = bookingInputSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  const result = await bookSlot(slotId, member, parsed.data);
  if (!result.ok) {
    return {
      status: 'error',
      message: appointmentsCopy.unavailable[result.reason],
      errors: {},
      values,
    };
  }
  after(() => notifyBooking(result.bookingId, 'booked'));
  revalidatePath('/appointments', 'layout');
  redirect('/account?booked=1');
}
