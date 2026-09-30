import { bookingNotice, serviceLabel, staffBookingNotice } from '@/content/appointments';
import { consultingNotice, enrollmentNotice } from '@/content/notifications';
import { formatDateTime } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { mobilePhone } from '@/lib/validation';
import { getBookingContact } from '@/modules/appointments/service';
import { getConsultingRequest } from '@/modules/consulting/service';
import { emailAvailable, sendEmail } from '@/modules/messaging/email';
import { smsSender } from '@/modules/messaging/sms';
import { getEnrollmentContact } from '@/modules/training/service';

/**
 * Tells applicants about status changes (OQ-BD-13, requested by the owner on
 * 2026-09-30): an SMS to a mobile number and, when one is on file, an email.
 * Callers run this after the response (`after()`), so a slow provider never
 * holds up the admin panel. Every attempt is logged in `notifications`.
 */

type Notice = { subject: string; text: string };

type Target = {
  entity: 'Enrollment' | 'ConsultingRequest' | 'Booking';
  entityId: string;
  event: string;
  phone: string | null;
  email: string | null;
  notice: Notice;
};

function accountLink(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return new URL('/account', base).toString();
}

async function deliver(target: Target) {
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

  const mobile = mobilePhone.safeParse(target.phone ?? undefined);
  if (mobile.success) {
    const sender = smsSender();
    const sent = sender ? await sender.send(mobile.data, target.notice.text) : false;
    await log('SMS', mobile.data, sent);
  }
  // Email is optional: without an SMTP server in production it is skipped, not failed.
  if (target.email && emailAvailable()) {
    const sent = await sendEmail({ to: target.email, ...target.notice });
    await log('EMAIL', target.email, sent);
  }
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

/**
 * Booking messages: the member hears about a new booking and a cancellation
 * by staff; on a new booking the staff member also gets an email if one is set.
 */
export async function notifyBooking(bookingId: string, event: 'booked' | 'cancelledByStaff') {
  const booking = await getBookingContact(bookingId);
  if (!booking) return;
  const service = serviceLabel[booking.slot.staff.service];
  const when = formatDateTime(booking.slot.startsAt);
  await deliver({
    entity: 'Booking',
    entityId: bookingId,
    event: `booking.${event}`,
    phone: booking.phone,
    email: booking.email,
    notice: bookingNotice[event](service, booking.slot.staff.fullName, when, accountLink()),
  });
  if (event === 'booked' && booking.slot.staff.email && emailAvailable()) {
    const sent = await sendEmail({
      to: booking.slot.staff.email,
      ...staffBookingNotice(booking.fullName, booking.topic, when),
    });
    await prisma.notification.create({
      data: {
        entity: 'Booking',
        entityId: bookingId,
        event: 'booking.staffAlert',
        channel: 'EMAIL',
        recipient: booking.slot.staff.email,
        status: sent ? 'SENT' : 'FAILED',
      },
    });
  }
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
