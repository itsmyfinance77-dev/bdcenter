import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { runReminders } from '@/modules/reminders/service';
import { getSetting, setSetting, type ReminderSettings } from '@/modules/settings/service';
import { createTestActor, removeTestActor } from './actor';

/**
 * Reminder SMS against the dev database. Runs use a clock in 2031 so nothing
 * real is in the window; rows use the `test-rem-` prefix and 0991 phones. The
 * reminder setting and the job's last-run row are put back afterwards.
 */

const PREFIX = 'test-rem-';
const ACTOR = 'test-rem-actor@bdcenter.test';
const HOUR = 60 * 60 * 1000;
/** 10:00 in Tehran (06:30 UTC): outside the default quiet hours. */
const NOW = new Date('2031-03-10T06:30:00Z');

let admin: { id: string };
let settingBefore: ReminderSettings;
let jobRunBefore: Awaited<ReturnType<typeof prisma.jobRun.findUnique>>;

const defaults: ReminderSettings = {
  bookings: { enabled: true, hoursBefore: 24 },
  courses: { enabled: true, hoursBefore: 24 },
  quietFrom: 22,
  quietUntil: 8,
};

async function cleanup() {
  const bookings = await prisma.booking.findMany({
    where: { topic: { startsWith: PREFIX } },
    select: { id: true },
  });
  const enrollments = await prisma.enrollment.findMany({
    where: { phone: { startsWith: '0991' } },
    select: { id: true },
  });
  const ids = [...bookings, ...enrollments].map((row) => row.id);
  await prisma.reminder.deleteMany({ where: { targetId: { in: ids } } });
  await prisma.notification.deleteMany({ where: { entityId: { in: ids } } });
  await prisma.booking.deleteMany({ where: { topic: { startsWith: PREFIX } } });
  await prisma.appointmentSlot.deleteMany({
    where: { staff: { fullName: { startsWith: PREFIX } } },
  });
  await prisma.staffProfile.deleteMany({ where: { fullName: { startsWith: PREFIX } } });
  await prisma.course.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.sandboxSms.deleteMany({ where: { phone: { startsWith: '0991' } } });
}

beforeAll(async () => {
  admin = await createTestActor(ACTOR);
  settingBefore = await getSetting('reminders');
  jobRunBefore = await prisma.jobRun.findUnique({ where: { name: 'reminders' } });
  await cleanup();
});
beforeEach(async () => {
  await setSetting('reminders', defaults, admin.id);
});
afterAll(async () => {
  await cleanup();
  await setSetting('reminders', settingBefore, admin.id);
  await prisma.jobRun.deleteMany({ where: { name: 'reminders' } });
  if (jobRunBefore) await prisma.jobRun.create({ data: jobRunBefore as never });
  await removeTestActor(ACTOR);
  await prisma.$disconnect();
});

let seq = 0;

async function booking(startsAt: Date, options: { createdAt?: Date; phone?: string } = {}) {
  seq += 1;
  const staff = await prisma.staffProfile.create({
    data: { service: 'CONSULTING', fullName: `${PREFIX}staff-${seq}`, mobile: '09910000099' },
  });
  const slot = await prisma.appointmentSlot.create({
    data: {
      staffId: staff.id,
      startsAt,
      endsAt: new Date(startsAt.getTime() + HOUR / 2),
      location: 'دفتر مرکز',
    },
  });
  return prisma.booking.create({
    data: {
      slotId: slot.id,
      activeSlotId: slot.id,
      memberId: `m-rem-${seq}`,
      fullName: 'مراجع آزمایشی',
      phone: options.phone ?? `099100000${String(seq).padStart(2, '0')}`,
      topic: `${PREFIX}topic`,
      createdAt: options.createdAt ?? new Date(NOW.getTime() - 3 * 24 * HOUR),
    },
  });
}

async function enrollment(
  startsAt: Date,
  options: { status?: 'NEW' | 'ACCEPTED'; course?: 'PUBLISHED' | 'DRAFT' } = {},
) {
  seq += 1;
  const course = await prisma.course.create({
    data: {
      slug: `${PREFIX}course-${seq}`,
      title: 'دورهٔ آزمایشی',
      status: options.course ?? 'PUBLISHED',
      startsAt,
    },
  });
  return prisma.enrollment.create({
    data: {
      courseId: course.id,
      memberId: `m-rem-${seq}`,
      fullName: 'شرکت‌کننده',
      phone: `099100001${String(seq).padStart(2, '0')}`,
      status: options.status ?? 'ACCEPTED',
    },
  });
}

const reminderRows = (targetId: string) => prisma.reminder.findMany({ where: { targetId } });
const smsLog = (entityId: string) =>
  prisma.notification.findMany({ where: { entityId, channel: 'SMS' } });

describe('reminder SMS', () => {
  it('reminds a booking and an accepted enrollment once, whatever the number of runs', async () => {
    const b = await booking(new Date(NOW.getTime() + 20 * HOUR));
    const e = await enrollment(new Date(NOW.getTime() + 23 * HOUR));

    const first = await runReminders(NOW);
    expect(first).toMatchObject({ quiet: false, sent: 2, failed: 0 });
    const second = await runReminders(new Date(NOW.getTime() + 15 * 60 * 1000));
    expect(second).toMatchObject({ sent: 0, failed: 0 });

    expect(await reminderRows(b.id)).toMatchObject([{ kind: 'BOOKING', smsSent: true }]);
    expect(await reminderRows(e.id)).toMatchObject([{ kind: 'COURSE', smsSent: true }]);
    expect(await smsLog(b.id)).toMatchObject([
      { event: 'reminder.Booking', status: 'SENT', recipient: b.phone },
    ]);
    expect(await smsLog(e.id)).toMatchObject([{ event: 'reminder.Enrollment', status: 'SENT' }]);
    const run = await prisma.jobRun.findUniqueOrThrow({ where: { name: 'reminders' } });
    expect(run.result).toMatchObject({ sent: 0 });
  });

  it('waits for starts beyond the chosen hours and skips those under half an hour', async () => {
    const far = await booking(new Date(NOW.getTime() + 30 * HOUR));
    const soon = await booking(new Date(NOW.getTime() + 20 * 60 * 1000));
    await runReminders(NOW);
    expect(await reminderRows(far.id)).toHaveLength(0);
    expect(await reminderRows(soon.id)).toHaveLength(0);
    // Six hours later the far one is inside the 24-hour window.
    await runReminders(new Date(NOW.getTime() + 6 * HOUR));
    expect(await reminderRows(far.id)).toHaveLength(1);
  });

  it('does not remind a booking made after its reminder time', async () => {
    const late = await booking(new Date(NOW.getTime() + 5 * HOUR), {
      createdAt: new Date(NOW.getTime() - HOUR),
    });
    const result = await runReminders(NOW);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(await reminderRows(late.id)).toHaveLength(0);
  });

  it('sends nothing during the quiet hours and catches up afterwards', async () => {
    const b = await booking(new Date(NOW.getTime() + 12 * HOUR));
    // 23:00 in Tehran.
    const night = new Date('2031-03-10T19:30:00Z');
    const early = await booking(new Date(night.getTime() + 10 * HOUR));
    expect(await runReminders(night)).toMatchObject({ quiet: true, sent: 0 });
    expect(await reminderRows(early.id)).toHaveLength(0);
    // 08:00 the next morning: the start is still an hour away.
    await runReminders(new Date('2031-03-11T04:30:00Z'));
    expect(await reminderRows(early.id)).toHaveLength(1);
    expect(await reminderRows(b.id)).toHaveLength(0); // its start has passed by then
  });

  it('sends the evening before when the morning would be too late', async () => {
    await setSetting(
      'reminders',
      { ...defaults, bookings: { enabled: true, hoursBefore: 2 } },
      admin.id,
    );
    // 08:15 Tehran on 11 March: due at 06:15 (quiet), 08:00 is too close, so 21:00 the day before.
    const early = await booking(new Date('2031-03-11T04:45:00Z'));
    await runReminders(new Date('2031-03-10T17:00:00Z')); // 20:30
    expect(await reminderRows(early.id)).toHaveLength(0);
    await runReminders(new Date('2031-03-10T17:30:00Z')); // 21:00
    expect(await reminderRows(early.id)).toMatchObject([{ smsSent: true }]);
  });

  it('follows the switches and the hours set in the panel', async () => {
    await setSetting(
      'reminders',
      {
        ...defaults,
        bookings: { enabled: false, hoursBefore: 24 },
        courses: { enabled: true, hoursBefore: 2 },
      },
      admin.id,
    );
    const b = await booking(new Date(NOW.getTime() + 10 * HOUR));
    const e = await enrollment(new Date(NOW.getTime() + 10 * HOUR));
    await runReminders(NOW);
    expect(await reminderRows(b.id)).toHaveLength(0);
    expect(await reminderRows(e.id)).toHaveLength(0);
    await runReminders(new Date(NOW.getTime() + 8.5 * HOUR));
    expect(await reminderRows(b.id)).toHaveLength(0);
    expect(await reminderRows(e.id)).toHaveLength(1);
  });

  it('ignores cancelled slots, unaccepted enrollments and unpublished courses', async () => {
    const cancelled = await booking(new Date(NOW.getTime() + 10 * HOUR));
    await prisma.booking.update({
      where: { id: cancelled.id },
      data: { status: 'CANCELLED', activeSlotId: null },
    });
    const pending = await enrollment(new Date(NOW.getTime() + 10 * HOUR), { status: 'NEW' });
    const draft = await enrollment(new Date(NOW.getTime() + 10 * HOUR), { course: 'DRAFT' });
    await runReminders(NOW);
    for (const row of [cancelled, pending, draft]) {
      expect(await reminderRows(row.id)).toHaveLength(0);
    }
  });

  it('reminds again when the start time moves, and records a failed send', async () => {
    const b = await booking(new Date(NOW.getTime() + 10 * HOUR));
    await runReminders(NOW);
    const moved = new Date(NOW.getTime() + 20 * HOUR);
    await prisma.appointmentSlot.update({ where: { id: b.slotId }, data: { startsAt: moved } });
    await runReminders(NOW);
    expect(await reminderRows(b.id)).toHaveLength(2);

    const noPhone = await booking(new Date(NOW.getTime() + 10 * HOUR), { phone: 'نامعتبر' });
    expect(await runReminders(NOW)).toMatchObject({ failed: 1 });
    expect(await reminderRows(noPhone.id)).toMatchObject([{ smsSent: false }]);
  });
});
