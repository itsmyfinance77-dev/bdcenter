'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { memberCopy } from '@/content/members';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import {
  logoutMember,
  logoutMemberEverywhere,
  profileSchema,
  requireMember,
  rotateMemberCalendar,
  safeMemberNext,
  saveProfile,
} from '@/modules/members/service';
import { cancelBookingByMember } from '@/modules/appointments/service';
import { alertStaff, notifyBooking } from '@/modules/notifications/service';
import { cancelEnrollment } from '@/modules/training/service';
import { staffAlertText } from '@/content/admin';

export async function saveProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const member = await requireMember();
  const values = formValues(formData);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  const upload = (name: string) => {
    const value = formData.get(name);
    return value instanceof File ? value : null;
  };
  const result = await saveProfile(member.id, parsed.data, {
    letter: upload('letter'),
    nationalCard: upload('nationalCard'),
  });
  if (!result.ok) {
    return { status: 'error', message: GENERIC_ERROR, errors: result.errors, values };
  }
  const pending = result.approval === 'PENDING';
  if (result.reviewNeeded) {
    after(() =>
      alertStaff(
        'members',
        staffAlertText.members(parsed.data.fullName, parsed.data.companyName ?? ''),
        `/admin/members/${member.id}`,
      ),
    );
  }
  const next = safeMemberNext(formData.get('next'));
  if (next !== '/account' && !pending) redirect(next);
  revalidatePath('/account');
  return { status: 'success', message: pending ? memberCopy.savedPending : memberCopy.saved };
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

export async function rotateCalendarAction() {
  const member = await requireMember();
  await rotateMemberCalendar(member.id);
  revalidatePath('/account');
}

export async function cancelBookingAction(bookingId: string) {
  const member = await requireMember();
  if (await cancelBookingByMember(bookingId, member.id)) {
    after(() => notifyBooking(bookingId, 'cancelledByMember'));
  }
  revalidatePath('/account');
  revalidatePath('/appointments', 'layout');
}
