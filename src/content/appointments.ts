import { siteInfo } from './site';

/** Copy for appointment booking (ADR-0003). */

export const serviceLabel = {
  CONSULTING: 'مرکز مشاوره',
  SERVICE_DESK: 'میز خدمت',
} as const;

export const bookingStatusLabel = {
  BOOKED: 'رزرو شده',
  CANCELLED: 'لغو شده',
  DONE: 'انجام شده',
  NO_SHOW: 'حاضر نشد',
} as const;

export const appointmentsCopy = {
  pageTitle: (service: string) => `رزرو نوبت ${service}`,
  lead: 'یکی از زمان‌های خالی را انتخاب کنید. برای رزرو باید وارد حساب کاربری شوید.',
  noStaff: 'فعلاً نوبتی برای رزرو تعریف نشده است.',
  noSlots: 'در روزهای پیش رو زمان خالی ندارد.',
  bookTitle: 'رزرو نوبت',
  loginToBook: 'برای رزرو، وارد حساب کاربری شوید',
  profileNeeded: 'برای رزرو، ابتدا اطلاعات حساب کاربری خود را کامل کنید',
  confirm: 'ثبت رزرو',
  booked: 'نوبت شما رزرو شد.',
  myBookings: 'نوبت‌های من',
  noBookings: 'هنوز نوبتی رزرو نکرده‌اید.',
  cancel: 'لغو نوبت',
  cancelConfirm: 'این نوبت لغو شود؟',
  addToCalendar: 'افزودن به تقویم',
  bookLink: 'رزرو نوبت',
  unavailable: {
    taken: 'این زمان را شخص دیگری رزرو کرده است. لطفاً زمان دیگری انتخاب کنید.',
    past: 'زمان این نوبت گذشته است.',
    cancelled: 'این نوبت لغو شده است.',
    'not-found': 'این نوبت پیدا نشد.',
    limit: 'تعداد نوبت‌های رزروشدهٔ آیندهٔ شما در این بخش به حداکثر رسیده است.',
    overlap: 'در همین زمان نوبت دیگری دارید.',
    profile: 'ابتدا اطلاعات حساب کاربری خود را کامل کنید.',
    pending: 'حساب شما در انتظار تأیید مدیر سایت است؛ پس از تأیید می‌توانید نوبت بگیرید.',
    rejected: 'اطلاعات شخص حقوقی شما تأیید نشده است؛ آن را در حساب کاربری اصلاح کنید.',
  },
} as const;

type Notice = { subject: string; text: string };

const signature = `${siteInfo.name} اتاق یزد`;

/** Messages to the member; `when` is the formatted date and time. */
export const bookingNotice = {
  booked: (service: string, staff: string, when: string, link: string): Notice => ({
    subject: `رزرو نوبت ${service}`,
    text: `نوبت شما با ${staff} (${service}) برای ${when} رزرو شد.\n${link}\n${signature}`,
  }),
  cancelledByStaff: (service: string, staff: string, when: string, link: string): Notice => ({
    subject: `لغو نوبت ${service}`,
    text: `نوبت شما با ${staff} (${service}) در ${when} از طرف مرکز لغو شد.\n${link}\n${signature}`,
  }),
};

/** Email to the staff member about a new booking. */
export const staffBookingNotice = (who: string, topic: string, when: string): Notice => ({
  subject: `نوبت جدید: ${when}`,
  text: `${who} برای ${when} نوبت رزرو کرد.\nموضوع: ${topic}\n${signature}`,
});

/** SMS to the staff member (consultant) about their own appointments. */
export const staffBookingSms = {
  booked: (who: string, phone: string, topic: string, when: string): string =>
    `نوبت جدید برای شما: ${when}
${who} (${phone})
موضوع: ${topic}
${signature}`,
  cancelledByMember: (who: string, when: string): string =>
    `نوبت ${when} با ${who} از طرف مراجعه‌کننده لغو شد.
${signature}`,
};
