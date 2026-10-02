/** Persian labels for admin-panel enums and navigation. */

export const requestStatusLabel = {
  NEW: 'جدید',
  IN_REVIEW: 'در حال بررسی',
  ACCEPTED: 'پذیرفته شده',
  REJECTED: 'رد شده',
  DONE: 'انجام شده',
} as const;

export const contentStatusLabel = {
  DRAFT: 'پیش‌نویس',
  PUBLISHED: 'منتشر شده',
  ARCHIVED: 'بایگانی',
} as const;

export const articleKindLabel = { NEWS: 'خبر', EVENT: 'رویداد' } as const;

export const membershipTierLabel = {
  NORMAL: 'عادی',
  SPECIAL: 'ویژه',
  PREMIUM: 'ممتاز',
} as const;

export const adminRoleLabel = { ADMIN: 'مدیر کل', EDITOR: 'ویراستار' } as const;

export const formFieldTypeLabel = {
  TEXT: 'متن کوتاه',
  TEXTAREA: 'متن بلند',
  NUMBER: 'عدد',
  EMAIL: 'ایمیل',
  PHONE: 'تلفن',
  DATE: 'تاریخ',
  SELECT: 'انتخابی',
  FILE: 'فایل',
  CHECKBOX: 'تیک تأیید',
} as const;

/** EDITOR handles content and incoming requests; ADMIN also manages forms, users, the audit log and system status. */
export const adminNav = [
  { href: '/admin', title: 'داشبورد', adminOnly: false },
  { href: '/admin/stats', title: 'آمار', adminOnly: false },
  { href: '/admin/articles', title: 'اخبار و رویدادها', adminOnly: false },
  { href: '/admin/courses', title: 'دوره‌های آموزشی', adminOnly: false },
  { href: '/admin/pages', title: 'صفحه‌ها', adminOnly: false },
  { href: '/admin/links', title: 'پیوندها', adminOnly: false },
  { href: '/admin/appointments', title: 'نوبت‌دهی', adminOnly: false },
  { href: '/admin/consulting', title: 'درخواست‌های مشاوره', adminOnly: false },
  { href: '/admin/messages', title: 'پیام‌های تماس', adminOnly: false },
  { href: '/admin/forms', title: 'فرم‌ها و درخواست‌ها', adminOnly: false },
  { href: '/admin/members', title: 'اعضای سایت', adminOnly: true },
  { href: '/admin/users', title: 'کاربران پنل', adminOnly: true },
  { href: '/admin/audit', title: 'گزارش فعالیت', adminOnly: true },
  { href: '/admin/system', title: 'وضعیت سامانه', adminOnly: true },
  { href: '/admin/account', title: 'حساب من و امنیت', adminOnly: false },
  { href: '/admin/help', title: 'راهنما', adminOnly: false },
] as const;
