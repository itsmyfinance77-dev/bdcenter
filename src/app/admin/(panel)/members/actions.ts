'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { requireAdmin } from '@/modules/auth/service';
import { reviewMember, reviewSchema, setMemberActive } from '@/modules/members/service';
import { notifyMemberReview } from '@/modules/notifications/service';
import { setSetting } from '@/modules/settings/service';

function refresh(memberId?: string) {
  revalidatePath('/admin/members');
  if (memberId) revalidatePath(`/admin/members/${memberId}`);
}

export async function setMemberActiveAction(memberId: string, isActive: boolean) {
  const admin = await requireAdmin('ADMIN');
  await setMemberActive(memberId, isActive, admin.id);
  refresh(memberId);
}

export async function reviewMemberAction(
  memberId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin('ADMIN');
  const values = formValues(formData);
  const parsed = reviewSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  const reviewed = await reviewMember(memberId, parsed.data, admin.id);
  if (!reviewed) {
    return {
      status: 'error',
      message: 'این عضو از طرف شخص حقوقی ثبت‌نام نکرده است.',
      errors: {},
      values,
    };
  }
  after(() => notifyMemberReview(memberId, parsed.data.decision));
  refresh(memberId);
  return {
    status: 'success',
    message: parsed.data.decision === 'APPROVED' ? 'عضو تأیید شد.' : 'اطلاعات عضو رد شد.',
  };
}

export async function setNationalCardRequiredAction(required: boolean) {
  const admin = await requireAdmin('ADMIN');
  await setSetting('members.nationalCardRequired', required, admin.id);
  refresh();
}
