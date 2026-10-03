'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import {
  logoutMember,
  logoutMemberEverywhere,
  profileSchema,
  requireMember,
  safeMemberNext,
  updateProfile,
} from '@/modules/members/service';
import { cancelBookingByMember } from '@/modules/appointments/service';
import { notifyBooking } from '@/modules/notifications/service';
import { cancelEnrollment } from '@/modules/training/service';

export async function saveProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const member = await requireMember();
  const values = formValues(formData);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  await updateProfile(member.id, parsed.data);
  const next = safeMemberNext(formData.get('next'));
  if (next !== '/account') redirect(next);
  revalidatePath('/account');
  return { status: 'success', message: 'اطلاعات حساب ذخیره شد.' };
}

export async function cancelEnrollmentAction(enrollmentId: string) {
  const member = await requireMember();
  await cancelEnrollment(enrollmentId, member.id);
  revalidatePath('/account');
  revalidatePath('/courses', 'layout');
}

export async function memberLogoutAction() {
  await logoutMember();
  redirect('/');
}

export async function memberLogoutEverywhereAction() {
  const member = await requireMember();
  await logoutMemberEverywhere(member.id);
  redirect('/');
}

export async function cancelBookingAction(bookingId: string) {
  const member = await requireMember();
  if (await cancelBookingByMember(bookingId, member.id)) {
    after(() => notifyBooking(bookingId, 'cancelledByMember'));
  }
  revalidatePath('/account');
  revalidatePath('/appointments', 'layout');
}
