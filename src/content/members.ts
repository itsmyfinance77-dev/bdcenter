/** Copy for the member (visitor account) area and its SMS messages. */

export const memberCopy = {
  loginTitle: 'ورود / ثبت‌نام',
  loginLead:
    'شماره همراه خود را وارد کنید تا کد ورود برایتان پیامک شود. اگر حساب ندارید، با همین کار ساخته می‌شود.',
  otpSms: (code: string) => `کد ورود شما به سایت مرکز توسعه کسب‌وکار اتاق یزد: ${code}`,
  smsUnavailable: 'ارسال پیامک در حال حاضر فعال نیست. لطفاً بعداً دوباره تلاش کنید.',
  accountTitle: 'حساب کاربری',
  profileLead: 'این اطلاعات برای ثبت‌نام در دوره‌ها و پیگیری درخواست‌های شما استفاده می‌شود.',
  accountCreated: 'حساب شما ساخته شد.',
  completeProfile: 'برای ادامه، ابتدا نام خود را در حساب کاربری ثبت کنید.',
} as const;

/** Consulting requests as seen from the member area. */
export const consultingCopy = {
  trackInAccount: 'وضعیت آن را در «حساب کاربری» ببینید.',
  signInHint:
    'اگر وارد حساب کاربری شوید، اطلاعات شما خودکار پر می‌شود و وضعیت درخواست را در حساب خود می‌بینید.',
  none: 'هنوز درخواست مشاوره‌ای ثبت نکرده‌اید.',
} as const;
