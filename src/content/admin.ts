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
  { href: '/admin/services', title: 'خدمات مرکز', adminOnly: false },
  { href: '/admin/links', title: 'پیوندها', adminOnly: false },
  { href: '/admin/appointments', title: 'نوبت‌دهی', adminOnly: false },
  { href: '/admin/consulting', title: 'درخواست‌های مشاوره', adminOnly: false },
  { href: '/admin/messages', title: 'پیام‌های تماس', adminOnly: false },
  { href: '/admin/forms', title: 'فرم‌ها و درخواست‌ها', adminOnly: false },
  { href: '/admin/surveys', title: 'نظرسنجی‌ها', adminOnly: false },
  { href: '/admin/members', title: 'اعضای سایت', adminOnly: true },
  { href: '/admin/broadcasts', title: 'پیامک گروهی', adminOnly: true },
  { href: '/admin/users', title: 'کاربران پنل', adminOnly: true },
  { href: '/admin/audit', title: 'گزارش فعالیت', adminOnly: true },
  { href: '/admin/system', title: 'وضعیت سامانه', adminOnly: true },
  { href: '/admin/settings', title: 'تنظیمات سایت', adminOnly: true },
  { href: '/admin/sms-sandbox', title: 'صندوق پیامک آزمایشی', adminOnly: true, sandboxOnly: true },
  { href: '/admin/account', title: 'حساب من و امنیت', adminOnly: false },
  { href: '/admin/help', title: 'راهنما', adminOnly: false },
] as const;

/** The SMS sandbox inbox (SMS_PROVIDER="sandbox", test environments only). */
export const smsSandboxCopy = {
  title: 'صندوق پیامک آزمایشی',
  lead: 'این سایت در حالت آزمایشی است و هیچ پیامکی واقعاً فرستاده نمی‌شود. هر پیامکی که سایت می‌خواست بفرستد (کد ورود اعضا، اطلاع‌رسانی وضعیت درخواست‌ها) اینجا نمایش داده می‌شود. این فهرست هر چند ثانیه خودش به‌روز می‌شود.',
  filterLabel: 'فقط پیامک‌های این شماره',
  filter: 'نمایش',
  showAll: 'همهٔ شماره‌ها',
  clear: 'پاک کردن همهٔ پیامک‌ها',
  clearConfirm: 'همهٔ پیامک‌های صندوق آزمایشی پاک شوند؟',
  empty:
    'هنوز پیامکی نیامده است. در سایت با یک شمارهٔ همراه «ورود / ثبت‌نام» را بزنید؛ کد ورود اینجا دیده می‌شود.',
  codeLabel: 'کد ورود',
} as const;

/** Kinds of new requests staff can be alerted about (src/modules/settings). */
export const alertKindLabel = {
  consulting: 'درخواست مشاورهٔ تازه',
  forms: 'درخواست تازه در فرم‌ها (مثل میز خدمت)',
  contact: 'پیام تازه در «تماس با ما»',
  enrollments: 'ثبت‌نام تازه در دوره‌ها',
  members: 'عضو حقوقی منتظر تأیید',
} as const;

/** Short SMS/email texts to staff about a new request; a panel link is appended. */
export const staffAlertText = {
  consulting: (name: string, topic: string) => `درخواست مشاورهٔ تازه از ${name}: ${topic}`,
  forms: (form: string) => `درخواست تازه در فرم «${form}» ثبت شد.`,
  contact: (name: string) => `پیام تازه در «تماس با ما» از ${name}`,
  enrollments: (name: string, course: string) => `ثبت‌نام تازه در دورهٔ «${course}»: ${name}`,
  members: (name: string, company: string) =>
    `${name} از طرف «${company}» ثبت‌نام کرده و منتظر تأیید است.`,
} as const;

/** Who a group SMS goes to (src/modules/broadcasts). */
export const broadcastAudienceLabel = {
  members: 'همهٔ اعضای فعال سایت',
  individuals: 'اعضای شخص حقیقی',
  legal: 'نمایندگان تأییدشدهٔ اشخاص حقوقی',
  course: 'ثبت‌نام‌کنندگان یک دوره',
} as const;

/** Icons staff can pick for a «خدمات» menu item (names from src/components/site/icons.tsx). */
export const menuIconLabel = {
  cap: 'کلاه آموزش',
  chat: 'گفت‌وگو',
  clock: 'ساعت',
  calendar: 'تقویم',
  clipboard: 'فرم',
  factory: 'کارخانه',
  cup: 'فنجان',
  trend: 'نمودار رشد',
  briefcase: 'کیف',
  users: 'افراد',
  building: 'ساختمان',
  globe: 'کره زمین',
  spark: 'ستاره',
  link: 'پیوند',
} as const;
