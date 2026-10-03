import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createConsultingRequest } from '@/modules/consulting/service';
import { getSetting, setSetting } from '@/modules/settings/service';
import {
  alertStaff,
  listNotifications,
  notifyBooking,
  notifyConsultingStatus,
  notifyEnrollmentStatus,
} from '@/modules/notifications/service';

/**
 * Status notifications with the development `console` SMS provider and no
 * SMTP server (messages go to the log). Rows use the `test-` / 0997 prefixes.
 */

const PREFIX = 'test-notify-';

async function cleanup() {
  const enrollments = await prisma.enrollment.findMany({
    where: { phone: { startsWith: '0997' } },
    select: { id: true },
  });
  const requests = await prisma.consultingRequest.findMany({
    where: { topic: { startsWith: PREFIX } },
    select: { id: true },
  });
  await prisma.notification.deleteMany({
    where: { entityId: { in: [...enrollments, ...requests].map((row) => row.id) } },
  });
  const bookings = await prisma.booking.findMany({
    where: { topic: { startsWith: PREFIX } },
    select: { id: true },
  });
  await prisma.notification.deleteMany({
    where: { entityId: { in: bookings.map((row) => row.id) } },
  });
  await prisma.booking.deleteMany({ where: { topic: { startsWith: PREFIX } } });
  await prisma.appointmentSlot.deleteMany({
    where: { staff: { fullName: { startsWith: PREFIX } } },
  });
  await prisma.staffProfile.deleteMany({ where: { fullName: { startsWith: PREFIX } } });
  await prisma.course.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.consultingRequest.deleteMany({ where: { topic: { startsWith: PREFIX } } });
}

let log: string[] = [];

beforeAll(async () => {
  await cleanup();
  vi.spyOn(console, 'info').mockImplementation((line: string) => void log.push(line));
});
afterAll(async () => {
  await cleanup();
  vi.restoreAllMocks();
  await prisma.$disconnect();
});

describe('status notifications', () => {
  it('sends SMS and email for an accepted enrollment and logs both', async () => {
    const course = await prisma.course.create({
      data: { slug: `${PREFIX}course`, title: 'دوره آزمایشی', status: 'PUBLISHED' },
    });
    const enrollment = await prisma.enrollment.create({
      data: {
        courseId: course.id,
        memberId: 'm1',
        fullName: 'x',
        phone: '09970000001',
        email: 'x@bdcenter.test',
      },
    });
    log = [];
    await notifyEnrollmentStatus(enrollment.id, 'ACCEPTED');

    expect(log.some((line) => line.includes('09970000001') && line.includes('پذیرفته شد'))).toBe(
      true,
    );
    expect(log.some((line) => line.includes('x@bdcenter.test'))).toBe(true);
    const rows = (await listNotifications('Enrollment', [enrollment.id]))[enrollment.id];
    expect(rows?.map((row) => [row.channel, row.status, row.event]).sort()).toEqual([
      ['EMAIL', 'SENT', 'status.ACCEPTED'],
      ['SMS', 'SENT', 'status.ACCEPTED'],
    ]);
  });

  it('sends nothing for statuses without a message', async () => {
    const course = await prisma.course.findUniqueOrThrow({ where: { slug: `${PREFIX}course` } });
    const enrollment = await prisma.enrollment.create({
      data: { courseId: course.id, memberId: 'm2', fullName: 'y', phone: '09970000002' },
    });
    await notifyEnrollmentStatus(enrollment.id, 'IN_REVIEW');
    await notifyEnrollmentStatus(enrollment.id, 'NEW');
    expect(await listNotifications('Enrollment', [enrollment.id])).toEqual({});
  });

  it('skips SMS for a landline and still emails', async () => {
    const { id } = await createConsultingRequest({
      fullName: 'z',
      phone: '03591091050',
      email: 'z@bdcenter.test',
      topic: `${PREFIX}topic`,
      nationalId: undefined,
      companyName: undefined,
      description: undefined,
    });
    await notifyConsultingStatus(id, 'REJECTED');
    const rows = (await listNotifications('ConsultingRequest', [id]))[id];
    expect(rows?.map((row) => row.channel)).toEqual(['EMAIL']);
  });

  it('texts the consultant the time of a new booking and of a cancellation by the member', async () => {
    const staff = await prisma.staffProfile.create({
      data: { service: 'CONSULTING', fullName: `${PREFIX}staff`, mobile: '09970000009' },
    });
    const startsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const slot = await prisma.appointmentSlot.create({
      data: { staffId: staff.id, startsAt, endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000) },
    });
    const booking = await prisma.booking.create({
      data: {
        slotId: slot.id,
        activeSlotId: slot.id,
        memberId: 'm9',
        fullName: 'مراجع آزمایشی',
        phone: '09970000008',
        topic: `${PREFIX}topic`,
      },
    });

    log = [];
    await notifyBooking(booking.id, 'booked');
    const toStaff = log.filter((line) => line.includes('09970000009'));
    expect(toStaff).toHaveLength(1);
    expect(toStaff[0]).toContain('نوبت جدید');
    expect(toStaff[0]).toContain('مراجع آزمایشی');
    expect(log.some((line) => line.includes('09970000008'))).toBe(true);

    log = [];
    await notifyBooking(booking.id, 'cancelledByMember');
    expect(log.filter((line) => line.includes('09970000009') && line.includes('لغو'))).toHaveLength(
      1,
    );
    expect(log.some((line) => line.includes('09970000008'))).toBe(false);

    const rows = (await listNotifications('Booking', [booking.id]))[booking.id];
    expect(rows?.map((row) => row.event).sort()).toEqual([
      'booking.booked',
      'booking.staff.booked',
      'booking.staff.cancelledByMember',
    ]);
  });

  it('alerts the chosen staff about a new request, with a panel link', async () => {
    const admin = await prisma.adminUser.findFirstOrThrow({ select: { id: true } });
    const before = await getSetting('alerts.recipients');
    await setSetting(
      'alerts.recipients',
      { consulting: { phones: ['09970000007'], emails: ['staff@bdcenter.test'] } },
      admin.id,
    );
    try {
      log = [];
      await alertStaff('consulting', 'درخواست مشاورهٔ تازه از آزمون', '/admin/consulting');
      await alertStaff('forms', 'بدون گیرنده', '/admin/forms');
      expect(log.filter((line) => line.includes('09970000007'))).toHaveLength(1);
      expect(log.some((line) => line.includes('/admin/consulting'))).toBe(true);
      expect(log.some((line) => line.includes('staff@bdcenter.test'))).toBe(true);
      expect(log.some((line) => line.includes('بدون گیرنده'))).toBe(false);
    } finally {
      await setSetting('alerts.recipients', before, admin.id);
      await prisma.notification.deleteMany({
        where: { entity: 'StaffAlert', recipient: { in: ['09970000007', 'staff@bdcenter.test'] } },
      });
      await prisma.auditLog.deleteMany({
        where: {
          entity: 'SiteSetting',
          entityId: 'alerts.recipients',
          actorId: admin.id,
          createdAt: { gt: new Date(Date.now() - 60_000) },
        },
      });
    }
  });
});
