import { siteInfo } from './site';

/**
 * Reminder SMS/email before a booked appointment or a course starts (owner's
 * request, 2026-10-04). `when` is the weekday, date and time; `link` the
 * absolute address of the member area.
 */

type Notice = { subject: string; text: string };

const signature = `${siteInfo.name} اتاق یزد`;
const at = (location: string | null) => (location ? `، ${location}` : '');

export const reminderNotice = {
  booking: (
    service: string,
    staff: string,
    when: string,
    location: string | null,
    link: string,
  ): Notice => ({
    subject: `یادآوری نوبت ${service}`,
    text: `یادآوری: نوبت شما با ${staff} (${service})، ${when}${at(location)}.\n${link}\n${signature}`,
  }),
  /** `session` is «۲ از ۵» for a course with several sessions, null for a single one. */
  course: (
    course: string,
    when: string,
    location: string | null,
    link: string,
    session: string | null = null,
  ): Notice =>
    session
      ? {
          subject: `یادآوری جلسهٔ ${session} دوره «${course}»`,
          text: `یادآوری: جلسهٔ ${session} دوره «${course}» ${when}${at(location)} برگزار می‌شود.\n${link}\n${signature}`,
        }
      : {
          subject: `یادآوری شروع دوره «${course}»`,
          text: `یادآوری: دوره «${course}» ${when}${at(location)} شروع می‌شود.\n${link}\n${signature}`,
        },
};

/** Label of reminder messages in the panel's message history. */
export const reminderEventLabel = 'یادآوری';
