import { siteInfo } from './site';

/**
 * Texts of the SMS/email sent when staff change a request's status.
 * `link` is the absolute address of the member area on this site.
 */

type Notice = { subject: string; text: string };

const signature = `${siteInfo.name} اتاق یزد`;

export const enrollmentNotice: Partial<
  Record<'ACCEPTED' | 'REJECTED' | 'DONE', (course: string, link: string) => Notice>
> = {
  ACCEPTED: (course, link) => ({
    subject: `پذیرش ثبت‌نام در دوره «${course}»`,
    text: `ثبت‌نام شما در دوره «${course}» پذیرفته شد.\nجزئیات: ${link}\n${signature}`,
  }),
  REJECTED: (course, link) => ({
    subject: `نتیجه ثبت‌نام در دوره «${course}»`,
    text: `ثبت‌نام شما در دوره «${course}» پذیرفته نشد.\nجزئیات: ${link}\n${signature}`,
  }),
  DONE: (course, link) => ({
    subject: `پایان دوره «${course}»`,
    text: `دوره «${course}» برای شما به پایان رسید.\nجزئیات: ${link}\n${signature}`,
  }),
};

export const consultingNotice: Partial<
  Record<'ACCEPTED' | 'REJECTED' | 'DONE', (topic: string, link: string) => Notice>
> = {
  ACCEPTED: (topic, link) => ({
    subject: 'پذیرش درخواست مشاوره',
    text: `درخواست مشاوره شما («${topic}») پذیرفته شد.\n${link}\n${signature}`,
  }),
  REJECTED: (topic, link) => ({
    subject: 'نتیجه درخواست مشاوره',
    text: `درخواست مشاوره شما («${topic}») پذیرفته نشد.\n${link}\n${signature}`,
  }),
  DONE: (topic, link) => ({
    subject: 'پایان درخواست مشاوره',
    text: `درخواست مشاوره شما («${topic}») انجام شد.\n${link}\n${signature}`,
  }),
};

/** Status changes of a form submission («فرم‌ها و درخواست‌ها»). */
export const formStatusNotice: Partial<
  Record<'ACCEPTED' | 'REJECTED' | 'DONE', (form: string) => Notice>
> = {
  ACCEPTED: (form) => ({
    subject: `پذیرش درخواست «${form}»`,
    text: `درخواست شما در «${form}» پذیرفته شد.\n${signature}`,
  }),
  REJECTED: (form) => ({
    subject: `نتیجه درخواست «${form}»`,
    text: `درخواست شما در «${form}» پذیرفته نشد.\n${signature}`,
  }),
  DONE: (form) => ({
    subject: `پایان درخواست «${form}»`,
    text: `درخواست شما در «${form}» انجام شد.\n${signature}`,
  }),
};

export const notifyCopy = {
  checkbox: 'اطلاع به متقاضی با پیامک/ایمیل',
  channel: { SMS: 'پیامک', EMAIL: 'ایمیل' },
  status: { SENT: 'ارسال شد', FAILED: 'ناموفق' },
} as const;
