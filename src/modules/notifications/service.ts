import {
  bookingNotice,
  serviceLabel,
  staffBookingNotice,
  staffBookingSms,
} from '@/content/appointments';
import { memberReviewSms } from '@/content/members';
import { consultingNotice, enrollmentNotice, formStatusNotice } from '@/content/notifications';
import { formatDateTime, toPersianDigits } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { mobilePhone } from '@/lib/validation';
import { getBookingContact } from '@/modules/appointments/service';
import { getConsultingRequest } from '@/modules/consulting/service';
import { getMemberContact } from '@/modules/members/service';
import { emailAvailable, sendEmail } from '@/modules/messaging/email';
import { smsSender } from '@/modules/messaging/sms';
import { getEnrollmentContact } from '@/modules/training/service';
import { submissionContact } from '@/modules/forms/submissions';
import { alertKindLabel } from '@/content/admin';
import { getSetting, type AlertKind } from '@/modules/settings/service';

/**
 * Tells applicants about status changes (OQ-BD-13, requested by the owner on
 * 2026-09-30): an SMS to a mobile number and, when one is on file, an email.
 * Callers run this after the response (`after()`), so a slow provider never
 * holds up the admin panel. Every attempt is logged in `notifications`.
 */

type Notice = { subject: string; text: string };

type Target = {
  entity:
    'Enrollment' | 'ConsultingRequest' | 'Booking' | 'Member' | 'StaffAlert' | 'FormSubmission';
  entityId: string;
  event: string;
  phone: string | null;
  email: string | null;
  notice: Notice;
};

function accountLink(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3010';
  return new URL('/account', base).toString();
}

/** Sends and logs the notice; true when the SMS went out. */
async function deliver(target: Target): Promise<boolean> {
  const log = (channel: 'SMS' | 'EMAIL', recipient: string, sent: boolean) =>
    prisma.notification.create({
      data: {
        entity: target.entity,
        entityId: target.entityId,
        event: target.event,
        channel,
        recipient,
        status: sent ? 'SENT' : 'FAILED',
      },
    });

  let smsSent = false;
  const mobile = mobilePhone.safeParse(target.phone ?? undefined);
  if (mobile.success) {
    const sender = smsSender();
    smsSent = sender ? await sender.send(mobile.data, target.notice.text) : false;
    await log('SMS', mobile.data, smsSent);
  }
  // Email is optional: without an SMTP server in production it is skipped, not failed.
  if (target.email && emailAvailable()) {
    const sent = await sendEmail({ to: target.email, ...target.notice });
    await log('EMAIL', target.email, sent);
  }
  return smsSent;
}

/** «Your answer arrived» after a form that asks for it (form setting confirmToApplicant). */
export function sendFormConfirmation(confirmation: {
  submissionId: string;
  phone: string | null;
  email: string | null;
  notice: Notice;
}): Promise<boolean> {
  return deliver({
    entity: 'FormSubmission',
    entityId: confirmation.submissionId,
    event: 'form.received',
    phone: confirmation.phone,
    email: confirmation.email,
    notice: confirmation.notice,
  });
}

/**
 * The satisfaction survey link after a request, booking or course is done
 * (surveys domain); true when the SMS went out.
 */
export function sendSurveyInvite(invite: {
  entity: 'ConsultingRequest' | 'Booking' | 'Enrollment';
  entityId: string;
  phone: string | null;
  email: string | null;
  notice: Notice;
}): Promise<boolean> {
  return deliver({ ...invite, event: 'survey.invite' });
}

/**
 * A reminder before a booking or a course starts (reminders domain), with the
 * same logging as every other notice; true when the SMS went out.
 */
export function sendReminder(reminder: {
  entity: 'Booking' | 'Enrollment';
  entityId: string;
  phone: string | null;
  email: string | null;
  notice: Notice;
}): Promise<boolean> {
  return deliver({ ...reminder, event: `reminder.${reminder.entity}` });
}

export async function notifyEnrollmentStatus(enrollmentId: string, status: string) {
  const build = enrollmentNotice[status as keyof typeof enrollmentNotice];
  if (!build) return;
  const enrollment = await getEnrollmentContact(enrollmentId);
  if (!enrollment) return;
  await deliver({
    entity: 'Enrollment',
    entityId: enrollmentId,
    event: `status.${status}`,
    phone: enrollment.phone,
    email: enrollment.email,
    notice: build(enrollment.courseTitle, accountLink()),
  });
}

export async function notifyConsultingStatus(requestId: string, status: string) {
  const build = consultingNotice[status as keyof typeof consultingNotice];
  if (!build) return;
  const request = await getConsultingRequest(requestId);
  if (!request) return;
  await deliver({
    entity: 'ConsultingRequest',
    entityId: requestId,
    event: `status.${status}`,
    phone: request.phone,
    email: request.email,
    notice: build(request.topic, accountLink()),
  });
}

/** Tells the applicant that staff moved a form submission on (staff opt in per change). */
export async function notifyFormStatus(submissionId: string, status: string) {
  const build = formStatusNotice[status as keyof typeof formStatusNotice];
  if (!build) return;
  const contact = await submissionContact(submissionId);
  if (!contact) return;
  await deliver({
    entity: 'FormSubmission',
    entityId: submissionId,
    event: `status.${status}`,
    phone: contact.phone,
    email: contact.email,
    notice: build(contact.formTitle),
  });
}

/**
 * Booking messages: the member hears about a new booking and a cancellation
 * by staff. The staff member gets an SMS with the date and time of a new
 * booking and of a cancellation by the member (owner's request, 2026-10-03),
 * and an email about a new booking if one is set.
 */
export async function notifyBooking(
  bookingId: string,
  event: 'booked' | 'cancelledByStaff' | 'cancelledByMember',
) {
  const booking = await getBookingContact(bookingId);
  if (!booking) return;
  const service = serviceLabel[booking.slot.staff.service];
  const when = formatDateTime(booking.slot.startsAt);
  if (event !== 'cancelledByMember') {
    await deliver({
      entity: 'Booking',
      entityId: bookingId,
      event: `booking.${event}`,
      phone: booking.phone,
      email: booking.email,
      notice: bookingNotice[event](service, booking.slot.staff.fullName, when, accountLink()),
    });
  }
  if (event === 'cancelledByStaff') return;

  const staff = booking.slot.staff;
  const text =
    event === 'booked'
      ? staffBookingSms.booked(
          booking.fullName,
          toPersianDigits(booking.phone),
          booking.topic,
          when,
        )
      : staffBookingSms.cancelledByMember(booking.fullName, when);
  const mobile = mobilePhone.safeParse(staff.mobile ?? undefined);
  if (mobile.success) {
    const sender = smsSender();
    const sent = sender ? await sender.send(mobile.data, text) : false;
    await logStaffMessage(bookingId, `booking.staff.${event}`, 'SMS', mobile.data, sent);
  }
  if (event === 'booked' && staff.email && emailAvailable()) {
    const sent = await sendEmail({
      to: staff.email,
      ...staffBookingNotice(booking.fullName, booking.topic, when),
    });
    await logStaffMessage(bookingId, 'booking.staffAlert', 'EMAIL', staff.email, sent);
  }
}

function logStaffMessage(
  bookingId: string,
  event: string,
  channel: 'SMS' | 'EMAIL',
  recipient: string,
  sent: boolean,
) {
  return prisma.notification.create({
    data: {
      entity: 'Booking',
      entityId: bookingId,
      event,
      channel,
      recipient,
      status: sent ? 'SENT' : 'FAILED',
    },
  });
}

/** Tells a legal-entity representative the result of an ADMIN's review. */
export async function notifyMemberReview(memberId: string, decision: 'APPROVED' | 'REJECTED') {
  const member = await getMemberContact(memberId);
  if (!member) return;
  const text = memberReviewSms[decision](member.companyName ?? '', accountLink());
  await deliver({
    entity: 'Member',
    entityId: memberId,
    event: `member.${decision}`,
    phone: member.phone,
    email: member.email,
    notice: { subject: 'نتیجهٔ بررسی حساب کاربری', text },
  });
}

/**
 * Tells the staff chosen in «تنظیمات سایت» about a new request (owner's
 * request, 2026-10-03), by SMS and/or email, with a link into the panel.
 * Runs after the response; every attempt is logged.
 */
export async function alertStaff(
  kind: AlertKind,
  text: string,
  panelPath: string,
  /** Recipients of this one request (e.g. a form's own); else «تنظیمات سایت»'s for `kind`. */
  only?: { phones: string[]; emails: string[] } | null,
) {
  const recipients = only ?? (await getSetting('alerts.recipients'))[kind];
  if (!recipients) return;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3010';
  const body = `${text}\n${new URL(panelPath, base).toString()}`;
  const sender = recipients.phones.length > 0 ? smsSender() : null;
  for (const phone of recipients.phones) {
    const sent = sender ? await sender.send(phone, body) : false;
    await logStaffAlert(kind, 'SMS', phone, sent);
  }
  if (emailAvailable()) {
    for (const to of recipients.emails) {
      const sent = await sendEmail({ to, subject: alertKindLabel[kind], text: body });
      await logStaffAlert(kind, 'EMAIL', to, sent);
    }
  }
}

function logStaffAlert(
  kind: AlertKind,
  channel: 'SMS' | 'EMAIL',
  recipient: string,
  sent: boolean,
) {
  return prisma.notification.create({
    data: {
      entity: 'StaffAlert',
      entityId: kind,
      event: `alert.${kind}`,
      channel,
      recipient,
      status: sent ? 'SENT' : 'FAILED',
    },
  });
}

/** Statuses that send a message when an admin chooses to notify. */
export function isNotifiableStatus(kind: 'enrollment' | 'consulting', status: string): boolean {
  return status in (kind === 'enrollment' ? enrollmentNotice : consultingNotice);
}

export type NotificationRow = {
  channel: 'SMS' | 'EMAIL';
  status: 'SENT' | 'FAILED';
  event: string;
  createdAt: Date;
};

/** Messages sent for each of the given records, newest first. */
export async function listNotifications(
  entity: Target['entity'],
  entityIds: string[],
): Promise<Record<string, NotificationRow[]>> {
  if (entityIds.length === 0) return {};
  const rows = await prisma.notification.findMany({
    where: { entity, entityId: { in: entityIds } },
    orderBy: { createdAt: 'desc' },
    select: { entityId: true, channel: true, status: true, event: true, createdAt: true },
  });
  const result: Record<string, NotificationRow[]> = {};
  for (const { entityId, ...row } of rows) (result[entityId] ??= []).push(row);
  return result;
}
