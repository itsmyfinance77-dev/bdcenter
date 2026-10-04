import { siteInfo } from './site';

/** Public form copy for the form settings (package B of the advanced form builder). */

const signature = `${siteInfo.name} اتاق یزد`;

/** Why a form does not take an answer right now. */
export const formClosedMessage = {
  'not-yet': (opensAt: string) => `این فرم از ${opensAt} پاسخ می‌پذیرد.`,
  closed: () => 'مهلت پاسخ به این فرم تمام شده است.',
  full: () => 'ظرفیت این فرم تکمیل شده است.',
  'sign-in': () => 'این فرم ویژهٔ اعضای سایت است. برای پر کردن آن وارد حساب کاربری شوید.',
  already: () => 'شما قبلاً این فرم را پر کرده‌اید. پاسخ شما ثبت شده است.',
} as const;

export const formCopy = {
  signIn: 'ورود / ثبت‌نام',
  membersBadge: 'ویژهٔ اعضا',
  closedBadge: 'بسته شده',
  prefillNote: 'برخی فیلدها از اطلاعات حساب کاربری شما پر شده‌اند؛ در صورت نیاز آن‌ها را اصلاح کنید.',
} as const;

/** «Your answer arrived», when the form asks for it. */
export const formReceivedNotice = (form: string) => ({
  subject: `دریافت پاسخ شما به «${form}»`,
  text: `پاسخ شما به «${form}» دریافت شد و بررسی می‌شود.\n${signature}`,
});
