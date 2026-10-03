'use server';

import { revalidatePath } from 'next/cache';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { requireAdmin } from '@/modules/auth/service';
import {
  ALERT_KINDS,
  contactInputSchema,
  parseHomeStats,
  parseRecipients,
  saveContactInfo,
  setSetting,
  type AlertKind,
  type AlertRecipients,
} from '@/modules/settings/service';

export async function saveContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin('ADMIN');
  const values = formValues(formData);
  const parsed = contactInputSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  await saveContactInfo(parsed.data, admin.id);
  // The footer is on every page.
  revalidatePath('/', 'layout');
  return { status: 'success', message: 'اطلاعات تماس ذخیره شد و در سایت نمایش داده می‌شود.' };
}

export async function saveAlertsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin('ADMIN');
  const values = formValues(formData);
  const recipients: Partial<Record<AlertKind, AlertRecipients>> = {};
  const errors: Record<string, string> = {};
  for (const kind of ALERT_KINDS) {
    const { phones, emails, invalid } = parseRecipients((values[kind] ?? '').slice(0, 2000));
    if (invalid.length > 0) {
      errors[kind] = `این موارد شمارهٔ همراه یا ایمیل معتبر نیستند: ${invalid.join('، ')}`;
    }
    if (phones.length + emails.length > 20) errors[kind] = 'حداکثر ۲۰ گیرنده برای هر مورد.';
    if (phones.length + emails.length > 0) recipients[kind] = { phones, emails };
  }
  if (Object.keys(errors).length > 0) {
    return { status: 'error', message: GENERIC_ERROR, errors, values };
  }
  await setSetting('alerts.recipients', recipients, admin.id);
  revalidatePath('/admin/settings');
  return { status: 'success', message: 'گیرندگان اطلاع‌رسانی ذخیره شدند.' };
}

export async function saveStatsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin('ADMIN');
  const values = formValues(formData);
  const { stats, errors } = parseHomeStats(values);
  if (Object.keys(errors).length > 0) {
    return { status: 'error', message: GENERIC_ERROR, errors, values };
  }
  await setSetting('home.stats', stats, admin.id);
  revalidatePath('/');
  return {
    status: 'success',
    message:
      stats.length > 0
        ? 'اعداد در صفحهٔ اصلی نمایش داده می‌شوند.'
        : 'بخش «مرکز در یک نگاه» پنهان شد.',
  };
}
