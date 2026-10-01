import { aboutText } from './site';

/**
 * Institutional pages that admins edit in the panel (`/admin/pages`). Each
 * built-in page has a fixed public address; until an admin publishes it, the
 * public page shows `fallback` (the approved copy) or the "being prepared"
 * notice.
 *
 * The privacy/terms drafts only list what the code actually collects. Every
 * `[…]` gap is a decision for the center (OQ-BD-12) and must be filled in and
 * reviewed before publishing.
 */

const privacyDraft = `> پیش‌نویس — پیش از انتشار، جاهای خالی داخل [ ] را کامل و متن را با واحد حقوقی بررسی کنید.

## چه اطلاعاتی نگه می‌داریم

- **حساب کاربری:** شماره همراه (برای ورود با کد پیامکی)، و در صورت تکمیل: نام، کد ملی یا شناسه ملی، نام شرکت و ایمیل.
- **ثبت‌نام در دوره‌ها:** همان اطلاعات حساب در زمان ثبت‌نام، همراه با وضعیت ثبت‌نام.
- **درخواست مشاوره:** نام، کد یا شناسه ملی، شماره تماس، ایمیل، نام شرکت، موضوع و توضیحات درخواست.
- **فرم‌ها و میز خدمت:** پاسخ‌های فرم و فایل‌های پیوست‌شده.
- **پیام‌های تماس:** نام، شماره تماس یا ایمیل و متن پیام.

## برای چه استفاده می‌شود

این اطلاعات فقط برای رسیدگی به همان درخواست، ثبت‌نام یا پیام، و تماس با شما دربارهٔ آن استفاده می‌شود. کد یا شناسه ملی برای تشخیص عضویت در اتاق بازرگانی یزد به کار می‌رود.

## کوکی‌ها و آمار

سایت فقط کوکی لازم برای ورود به حساب را نگه می‌دارد. آمار بازدید به‌صورت شمارش روزانهٔ صفحه‌ها و بدون ذخیرهٔ نشانی IP یا شناسهٔ بازدیدکننده ثبت می‌شود. نشانی IP فقط به‌طور موقت برای جلوگیری از ارسال‌های مکرر و سوءاستفاده نگه داشته می‌شود.

## چه کسانی به اطلاعات دسترسی دارند

کارکنان مجاز مرکز از طریق پنل مدیریت. شماره همراه و متن پیامک برای ارسال به [نام سرویس‌دهندهٔ پیامک] فرستاده می‌شود.

## مدت نگهداری

[مدت نگهداری حساب‌ها، ثبت‌نام‌ها، درخواست‌ها، پیام‌ها و فایل‌های پیوست را مرکز تعیین می‌کند.]

## حقوق شما

می‌توانید اطلاعات حساب خود را در صفحهٔ «حساب کاربری» ویرایش کنید. برای حذف حساب یا اطلاعات خود [روش درخواست حذف، مثلاً تماس با شمارهٔ مرکز] .

## تماس

[نشانی و راه تماس مسئول رسیدگی به پرسش‌های حریم خصوصی]`;

const termsDraft = `> پیش‌نویس — پیش از انتشار، جاهای خالی داخل [ ] را کامل و متن را با واحد حقوقی بررسی کنید.

## حساب کاربری

ورود با شماره همراه و کد پیامکی انجام می‌شود. مسئولیت درستی اطلاعات واردشده با کاربر است.

## ثبت‌نام در دوره‌ها

[شرایط پذیرش، انصراف، هزینه و صدور گواهی]

## درخواست‌ها و فرم‌ها

[نحوه و زمان رسیدگی به درخواست‌ها]

## مالکیت محتوا

[شرایط استفاده از مطالب سایت]

## تغییر قوانین

[نحوهٔ اطلاع‌رسانی تغییرات]`;

export type SystemPage = {
  slug: string;
  path: string;
  title: string;
  /** Body shown (and offered to the editor) before the page is first saved. */
  draft: string;
  /** Public fallback while nothing is published; null shows the "being prepared" notice. */
  fallback: string | null;
};

export const systemPages: readonly SystemPage[] = [
  { slug: 'about', path: '/about', title: 'درباره مرکز', draft: aboutText, fallback: aboutText },
  { slug: 'privacy', path: '/privacy', title: 'حریم خصوصی', draft: privacyDraft, fallback: null },
  {
    slug: 'terms',
    path: '/terms',
    title: 'قوانین و شرایط استفاده',
    draft: termsDraft,
    fallback: null,
  },
];

export const pageCopy = {
  preparing: 'متن این صفحه در حال آماده‌سازی است.',
  draftWarning:
    'این متن پیش‌نویس است و هنوز منتشر نشده؛ پیش از انتشار جاهای خالی داخل [ ] را کامل کنید.',
} as const;

/** Sections of the admin-editable link lists. */
export const linkSections = {
  'chamber-services': 'دسترسی به خدمات اتاق بازرگانی یزد (صفحه اصلی)',
  'useful-links': 'پیوندهای مفید (پاورقی)',
  social: 'شبکه‌های اجتماعی (پاورقی)',
} as const;

export type LinkSection = keyof typeof linkSections;
