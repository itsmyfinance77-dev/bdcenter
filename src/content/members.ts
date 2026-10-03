/** Copy for the member (visitor account) area and its SMS messages. */

export const memberCopy = {
  loginTitle: 'ورود / ثبت‌نام',
  loginLead:
    'شماره همراه خود را وارد کنید تا کد ورود برایتان پیامک شود. اگر حساب ندارید، با همین کار ساخته می‌شود.',
  otpSms: (code: string) => `کد ورود شما به سایت مرکز توسعه کسب‌وکار اتاق یزد: ${code}`,
  sandboxHint:
    'حالت آزمایشی: پیامک واقعی فرستاده نمی‌شود. کد ورود را در پنل مدیریت، بخش «صندوق پیامک آزمایشی» ببینید.',
  smsUnavailable: 'ارسال پیامک در حال حاضر فعال نیست. لطفاً بعداً دوباره تلاش کنید.',
  accountTitle: 'حساب کاربری',
  profileLead: 'این اطلاعات برای ثبت‌نام در دوره‌ها و پیگیری درخواست‌های شما استفاده می‌شود.',
  accountCreated: 'حساب شما ساخته شد.',
  completeProfile:
    'برای ثبت‌نام در دوره‌ها و رزرو نوبت، ابتدا اطلاعات زیر را کامل کنید و «ذخیره» را بزنید.',
  pendingApproval:
    'اطلاعات شخص حقوقی شما ثبت شد و در انتظار تأیید مدیر سایت است. پس از تأیید با پیامک خبر می‌دهیم؛ از آن پس می‌توانید در دوره‌ها ثبت‌نام کنید و نوبت بگیرید.',
  rejected: (note: string | null) =>
    `اطلاعات شخص حقوقی شما تأیید نشد${note ? `: ${note}` : '.'} لطفاً اطلاعات یا معرفی‌نامه را اصلاح و دوباره ذخیره کنید.`,
  saved: 'اطلاعات حساب ذخیره شد.',
  savedPending: 'اطلاعات ذخیره شد و برای تأیید به مدیر سایت فرستاده شد.',
  /** Why a signed-in member cannot enroll or book yet. */
  blocked: {
    profile: 'ابتدا اطلاعات حساب کاربری خود را کامل کنید',
    pending: 'حساب شما در انتظار تأیید مدیر سایت است',
    rejected: 'اطلاعات شخص حقوقی شما تأیید نشده است؛ آن را در حساب کاربری اصلاح کنید',
  },
} as const;

export const personTypeLabel = {
  INDIVIDUAL: 'شخص حقیقی',
  LEGAL: 'از طرف شخص حقوقی',
} as const;

export const approvalLabel = {
  NOT_REQUIRED: 'نیاز ندارد',
  PENDING: 'در انتظار تأیید',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
} as const;

const signature = 'مرکز توسعه کسب‌وکار اتاق یزد';

/** SMS to a legal-entity representative after an ADMIN's review. */
export const memberReviewSms = {
  APPROVED: (company: string, link: string) =>
    `حساب شما از طرف «${company}» تأیید شد. اکنون می‌توانید در دوره‌ها ثبت‌نام کنید و نوبت بگیرید.
${link}
${signature}`,
  REJECTED: (company: string, link: string) =>
    `اطلاعات ثبت‌شدهٔ شما از طرف «${company}» تأیید نشد. دلیل را در حساب کاربری ببینید و اطلاعات را اصلاح کنید.
${link}
${signature}`,
};

/** Consulting requests as seen from the member area. */
export const consultingCopy = {
  trackInAccount: 'وضعیت آن را در «حساب کاربری» ببینید.',
  signInHint:
    'اگر وارد حساب کاربری شوید، اطلاعات شما خودکار پر می‌شود و وضعیت درخواست را در حساب خود می‌بینید.',
  none: 'هنوز درخواست مشاوره‌ای ثبت نکرده‌اید.',
} as const;
