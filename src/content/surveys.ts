import { siteInfo } from './site';

/**
 * Copy of the satisfaction survey (owner's request, 2026-10-04): the SMS with
 * the link, the public answer page and the panel's results page.
 */

const signature = `${siteInfo.name} اتاق یزد`;

export const surveyKindLabel = {
  CONSULTING: 'درخواست مشاوره',
  BOOKING: 'نوبت مشاوره و میز خدمت',
  COURSE: 'دوره آموزشی',
} as const;

/** The SMS (and email) asking for an answer; `link` is the personal survey address. */
export const surveyInvite = (subject: string, link: string) => ({
  subject: `نظرسنجی: ${subject}`,
  text: `نظر شما دربارهٔ ${subject} برای ما مهم است. لطفاً در یک دقیقه به آن نمره دهید:\n${link}\n${signature}`,
});

export const surveyCopy = {
  checkbox: 'ارسال پیامک نظرسنجی (هنگام «انجام شده»)',
  pageTitle: 'نظرسنجی رضایت',
  question: 'چقدر راضی بودید؟',
  lead: (subject: string) =>
    `از اینکه از خدمات مرکز استفاده کردید سپاسگزاریم. لطفاً به ${subject} نمره دهید.`,
  scoreLegend: 'نمرهٔ شما',
  scoreLabels: { 1: 'خیلی ناراضی', 2: 'ناراضی', 3: 'متوسط', 4: 'راضی', 5: 'خیلی راضی' },
  commentLabel: 'پیشنهاد یا توضیح (اختیاری)',
  submit: 'ثبت نظر',
  thanks: 'نظر شما ثبت شد. سپاسگزاریم!',
  answered: 'به این نظرسنجی قبلاً پاسخ داده شده است. سپاسگزاریم!',
  expired: 'مهلت پاسخ به این نظرسنجی تمام شده است.',
  notFound: 'این نشانی نظرسنجی معتبر نیست.',
  scoreRequired: 'یک نمره از ۱ تا ۵ انتخاب کنید.',
} as const;
