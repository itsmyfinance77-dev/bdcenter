'use server';

import { revalidatePath } from 'next/cache';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { requireAdmin } from '@/modules/auth/service';
import { announcementInputSchema } from '@/modules/settings/announcement';
import {
  ALERT_KINDS,
  contactInputSchema,
  parseHomeStats,
  parseRecipients,
  parseSiteMenu,
  reminderInputSchema,
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

export async function saveAnnouncementAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin('ADMIN');
  const values = formValues(formData);
  const parsed = announcementInputSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  await setSetting('site.announcement', parsed.data, admin.id);
  // The bar is on every public page.
  revalidatePath('/', 'layout');
  return {
    status: 'success',
    message: parsed.data.enabled
      ? 'اطلاعیه ذخیره شد و در زمان تعیین‌شده بالای همهٔ صفحه‌های سایت نمایش داده می‌شود.'
      : 'اطلاعیه خاموش است و در سایت نمایش داده نمی‌شود.',
  };
}

export async function saveRemindersAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin('ADMIN');
  const values = formValues(formData);
  const parsed = reminderInputSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  await setSetting('reminders', parsed.data, admin.id);
  revalidatePath('/admin/settings');
  return { status: 'success', message: 'تنظیمات یادآوری ذخیره شد.' };
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

export async function saveMenuAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin('ADMIN');
  const values = formValues(formData);
  const { menu, errors } = parseSiteMenu(values);
  if (Object.keys(errors).length > 0) {
    return { status: 'error', message: GENERIC_ERROR, errors, values };
  }
  await setSetting('site.menu', menu, admin.id);
  revalidatePath('/', 'layout');
  return {
    status: 'success',
    message:
      values.reset === '1'
        ? 'منوی پیش‌فرض برگردانده شد.'
        : 'منو ذخیره شد و در همهٔ صفحه‌ها نمایش داده می‌شود.',
  };
}
