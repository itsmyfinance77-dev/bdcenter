import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  bookSlot,
  cancelBookingByMember,
  cancelSlot,
  createSlots,
  deleteSlot,
  deleteStaff,
  listStaffWithFreeSlots,
  MAX_UPCOMING_BOOKINGS_PER_SERVICE,
  setBookingStatus,
  type Booker,
} from '@/modules/appointments/service';

/**
 * Booking rules against the dev database. Staff use the `test-appt-` name
 * prefix, members the 0996 phone prefix; everything is removed afterwards.
 */

const PREFIX = 'test-appt-';
const HOUR = 3600_000;
let actorId: string;

async function cleanup() {
  const staff = await prisma.staffProfile.findMany({
    where: { fullName: { startsWith: PREFIX } },
    select: { id: true },
  });
  const staffIds = staff.map((s) => s.id);
  await prisma.booking.deleteMany({ where: { slot: { staffId: { in: staffIds } } } });
  await prisma.appointmentSlot.deleteMany({ where: { staffId: { in: staffIds } } });
  await prisma.staffProfile.deleteMany({ where: { id: { in: staffIds } } });
  await prisma.member.deleteMany({ where: { phone: { startsWith: '0996' } } });
  await prisma.auditLog.deleteMany({ where: { actor: { email: `${PREFIX}admin@bdcenter.test` } } });
  await prisma.adminUser.deleteMany({ where: { email: `${PREFIX}admin@bdcenter.test` } });
}

beforeAll(async () => {
  await cleanup();
  const admin = await prisma.adminUser.create({
    data: { fullName: 'test', email: `${PREFIX}admin@bdcenter.test`, passwordHash: 'x' },
  });
  actorId = admin.id;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

let phoneCounter = 0;
async function member(named = true): Promise<Booker> {
  phoneCounter += 1;
  return prisma.member.create({
    data: {
      phone: `0996${String(phoneCounter).padStart(7, '0')}`,
      fullName: named ? `عضو ${phoneCounter}` : null,
    },
  });
}

async function staff(service: 'CONSULTING' | 'SERVICE_DESK' = 'CONSULTING') {
  return prisma.staffProfile.create({
    data: { service, fullName: `${PREFIX}${service}-${Math.random()}` },
  });
}

async function slot(staffId: string, startsInHours: number, lengthHours = 1) {
  const startsAt = new Date(Date.now() + startsInHours * HOUR);
  return prisma.appointmentSlot.create({
    data: { staffId, startsAt, endsAt: new Date(startsAt.getTime() + lengthHours * HOUR) },
  });
}

const topic = { topic: 'موضوع', description: undefined };

describe('booking', () => {
  it('gives a slot to exactly one of many people booking at once', async () => {
    const person = await staff();
    const target = await slot(person.id, 24);
    const members = await Promise.all(Array.from({ length: 12 }, () => member()));
    const results = await Promise.all(members.map((m) => bookSlot(target.id, m, topic)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.reason === 'taken')).toHaveLength(11);
    expect(await prisma.booking.count({ where: { slotId: target.id } })).toBe(1);
  });

  it('frees the slot when the member cancels, so someone else can book it', async () => {
    const person = await staff();
    const target = await slot(person.id, 48);
    const [first, second] = [await member(), await member()];
    const booked = await bookSlot(target.id, first, topic);
    if (!booked.ok) throw new Error(booked.reason);

    const free = await listStaffWithFreeSlots('CONSULTING');
    expect(free.find((s) => s.id === person.id)?.slots).toEqual([]);

    expect(await cancelBookingByMember(booked.bookingId, second.id)).toBe(false); // not theirs
    expect(await cancelBookingByMember(booked.bookingId, first.id)).toBe(true);
    expect(await cancelBookingByMember(booked.bookingId, first.id)).toBe(false); // already
    expect((await bookSlot(target.id, second, topic)).ok).toBe(true);

    // Reopening the first booking must not give the slot to two people.
    expect(await setBookingStatus(booked.bookingId, 'BOOKED', actorId)).toEqual({
      ok: false,
      reason: 'taken',
    });
  });

  it('refuses past, cancelled and unnamed bookings', async () => {
    const person = await staff();
    const past = await slot(person.id, -2);
    const cancelled = await slot(person.id, 72);
    await cancelSlot(cancelled.id, actorId);
    const someone = await member();
    expect(await bookSlot(past.id, someone, topic)).toEqual({ ok: false, reason: 'past' });
    expect(await bookSlot(cancelled.id, someone, topic)).toEqual({
      ok: false,
      reason: 'cancelled',
    });
    const future = await slot(person.id, 96);
    expect(await bookSlot(future.id, await member(false), topic)).toEqual({
      ok: false,
      reason: 'profile',
    });
    expect(await bookSlot('no-such-slot', someone, topic)).toEqual({
      ok: false,
      reason: 'not-found',
    });
  });

  it('limits upcoming bookings per service and refuses overlapping ones', async () => {
    const consultant = await staff('CONSULTING');
    const other = await staff('CONSULTING');
    const desk = await staff('SERVICE_DESK');
    const someone = await member();

    for (let i = 0; i < MAX_UPCOMING_BOOKINGS_PER_SERVICE; i++) {
      const s = await slot(consultant.id, 200 + i * 5);
      expect((await bookSlot(s.id, someone, topic)).ok).toBe(true);
    }
    const oneMore = await slot(consultant.id, 300);
    expect(await bookSlot(oneMore.id, someone, topic)).toEqual({ ok: false, reason: 'limit' });

    // Another service has its own limit, but not at a time that overlaps.
    const clash = await slot(desk.id, 200.5);
    expect(await bookSlot(clash.id, someone, topic)).toEqual({ ok: false, reason: 'overlap' });
    const fine = await slot(desk.id, 400);
    expect((await bookSlot(fine.id, someone, topic)).ok).toBe(true);

    const otherSlot = await slot(other.id, 500);
    expect(await bookSlot(otherSlot.id, someone, topic)).toEqual({ ok: false, reason: 'limit' });
  });
});

describe('staff tools', () => {
  it('creates slots without overlaps and protects booked history', async () => {
    const person = await staff();
    const base = Date.now() + 1000 * HOUR;
    const plan = (h: number, len = 1) => ({
      startsAt: new Date(base + h * HOUR),
      endsAt: new Date(base + (h + len) * HOUR),
      location: null,
    });
    expect(await createSlots(person.id, [plan(0), plan(1), plan(1.5), plan(3)], actorId)).toEqual({
      created: 3,
      skipped: 1,
    });
    expect(await createSlots(person.id, [plan(0.5), plan(5)], actorId)).toEqual({
      created: 1,
      skipped: 1,
    });

    const slots = await prisma.appointmentSlot.findMany({
      where: { staffId: person.id },
      orderBy: { startsAt: 'asc' },
    });
    const someone = await member();
    const booked = await bookSlot(slots[0]!.id, someone, topic);
    if (!booked.ok) throw new Error(booked.reason);

    expect(await deleteSlot(slots[0]!.id, actorId)).toBe(false); // has a booking
    expect(await deleteSlot(slots[1]!.id, actorId)).toBe(true);
    expect(await deleteStaff(person.id, actorId)).toBe(false); // has slots

    // Cancelling the slot cancels its booking and reports it for notification.
    expect(await cancelSlot(slots[0]!.id, actorId)).toBe(booked.bookingId);
    const after = await prisma.booking.findUniqueOrThrow({ where: { id: booked.bookingId } });
    expect(after).toMatchObject({ status: 'CANCELLED', activeSlotId: null });
  });
});
