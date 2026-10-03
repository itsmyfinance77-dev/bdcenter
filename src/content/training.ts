/** Copy for the on-site training pages (ADR-0002). No prices: OQ-BD-01. */

export const trainingCopy = {
  title: 'دوره‌های آموزشی',
  lead: 'دوره‌ها و برنامه‌های توانمندسازی مرکز. برای ثبت‌نام، با شماره همراه وارد سایت شوید.',
  empty: 'در حال حاضر دوره‌ای برای ثبت‌نام منتشر نشده است.',
  chamberLinkLead: 'دوره‌های دیگر اتاق بازرگانی یزد در سامانه آموزش اتاق ارائه می‌شود.',
  chamberLinkLabel: 'سامانه آموزش اتاق بازرگانی یزد',
  chamberUrl: 'https://yazdccima.com/services/edu',
  loginToEnroll: 'برای ثبت‌نام ابتدا وارد شوید',
  enroll: 'ثبت‌نام در این دوره',
  enrolled: 'ثبت‌نام شما انجام شد. نتیجه بررسی در «حساب کاربری» نمایش داده می‌شود.',
  alreadyEnrolled: 'شما در این دوره ثبت‌نام کرده‌اید.',
  profileNeeded: 'برای ثبت‌نام، ابتدا اطلاعات حساب کاربری خود را کامل کنید.',
} as const;

export const availabilityLabel = {
  open: 'ثبت‌نام باز است',
  full: 'ظرفیت تکمیل شد',
  closed: 'ثبت‌نام بسته است',
  started: 'دوره شروع شده است',
} as const;

export const enrollErrorMessage = {
  'not-found': 'این دوره دیگر در دسترس نیست.',
  profile: trainingCopy.profileNeeded,
  pending: 'حساب شما در انتظار تأیید مدیر سایت است؛ پس از تأیید می‌توانید ثبت‌نام کنید.',
  rejected: 'اطلاعات شخص حقوقی شما تأیید نشده است؛ آن را در حساب کاربری اصلاح کنید.',
  duplicate: trainingCopy.alreadyEnrolled,
  full: 'ظرفیت این دوره تکمیل شده است.',
  closed: 'ثبت‌نام این دوره بسته شده است.',
  started: 'این دوره شروع شده و ثبت‌نام آن بسته است.',
} as const;
