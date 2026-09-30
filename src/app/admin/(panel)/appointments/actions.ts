'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { formatNumber } from '@/lib/format';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { persianWeekday } from '@/lib/jalali';
import { fieldErrors } from '@/lib/validation';
import {
  bookingStatusSchema,
  cancelSlot,
  createSlots,
  deleteSlot,
  deleteStaff,
  planSeries,
  planSingleSlot,
  saveStaff,
  setBookingStatus,
  slotInputSchema,
  slotSeriesSchema,
  staffInputSchema,
} from '@/modules/appointments/service';
import { requireAdmin } from '@/modules/auth/service';
import { notifyBooking } from '@/modules/notifications/service';

/** Free slots show on the public pages; bookings on every admin page of this section. */
function refresh() {
  revalidatePath('/appointments', 'layout');
  revalidatePath('/admin/appointments', 'layout');
}

export async function saveStaffAction(
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const values = formValues(formData);
  const parsed = staffInputSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  const staffId = await saveStaff(id, parsed.data, admin.id);
  refresh();
  redirect(`/admin/appointments/staff/${staffId}?saved=1`);
}

export async function deleteStaffAction(id: string) {
  const admin = await requireAdmin();
  if (!(await deleteStaff(id, admin.id))) redirect(`/admin/appointments/staff/${id}?inUse=1`);
  refresh();
  redirect('/admin/appointments');
}

function createdMessage(created: number, skipped: number) {
  return skipped > 0
    ? `${formatNumber(created)} نوبت ساخته شد؛ ${formatNumber(skipped)} نوبت به‌خاطر هم‌پوشانی با نوبت‌های موجود ساخته نشد.`
    : `${formatNumber(created)} نوبت ساخته شد.`;
}

export async function addSlotAction(
  staffId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const values = formValues(formData);
  const parsed = slotInputSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  const plan = planSingleSlot(parsed.data);
  if (plan.startsAt <= new Date()) {
    return { status: 'error', message: 'زمان نوبت گذشته است.', errors: {}, values };
  }
  const { created, skipped } = await createSlots(staffId, [plan], admin.id);
  refresh();
  if (created === 0) {
    return { status: 'error', message: createdMessage(created, skipped), errors: {}, values };
  }
  return { status: 'success', message: createdMessage(created, skipped) };
}

export async function addSlotSeriesAction(
  staffId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const values = formValues(formData);
  const parsed = slotSeriesSchema.safeParse({ ...values, weekdays: formData.getAll('weekdays') });
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  const plans = planSeries(parsed.data, persianWeekday);
  if (plans === 'bad-range') {
    return {
      status: 'error',
      message: 'بازهٔ تاریخ باید درست و حداکثر یک سال باشد.',
      errors: { toDate: 'بازهٔ تاریخ درست نیست.' },
      values,
    };
  }
  if (plans === 'too-many') {
    return {
      status: 'error',
      message: 'تعداد نوبت‌ها بیش از ۳۰۰ است؛ بازه را کوتاه‌تر کنید.',
      errors: {},
      values,
    };
  }
  const future = plans.filter((plan) => plan.startsAt > new Date());
  const { created, skipped } = await createSlots(staffId, future, admin.id);
  refresh();
  return { status: 'success', message: createdMessage(created, skipped) };
}

export async function cancelSlotAction(slotId: string) {
  const admin = await requireAdmin();
  const bookingId = await cancelSlot(slotId, admin.id);
  if (bookingId) after(() => notifyBooking(bookingId, 'cancelledByStaff'));
  refresh();
}

export async function deleteSlotAction(slotId: string) {
  const admin = await requireAdmin();
  await deleteSlot(slotId, admin.id);
  refresh();
}

export async function setBookingStatusAction(bookingId: string, formData: FormData) {
  const admin = await requireAdmin();
  const status = bookingStatusSchema.parse(formData.get('status'));
  const result = await setBookingStatus(bookingId, status, admin.id);
  if (result.ok && result.changed && status === 'CANCELLED' && formData.get('notify') === 'on') {
    after(() => notifyBooking(bookingId, 'cancelledByStaff'));
  }
  refresh();
  if (!result.ok) redirect('/admin/appointments?taken=1');
}
