import { z } from 'zod';
import { buildCalendar } from '@/lib/ical';
import { parseJalaliDateTime } from '@/lib/jalali';
import { richInput } from '@/lib/rich-html';
import { prisma, Prisma } from '@/lib/prisma';
import { email, mobilePhone, optionalText, requiredText, toLatinDigits } from '@/lib/validation';
import { recordAudit } from '@/modules/audit/service';
import {
  checkImageUpload,
  deleteStoredImage,
  storeImage,
  type ImageVariant,
} from '@/modules/files/service';
import { countCreatedPerDay } from '@/lib/daily-counts';
import type { MemberAccess } from '@/modules/members/access';

/**
 * Appointment booking for consulting and the service desk (ADR-0003). Admins
 * keep staff profiles and their time slots; signed-in members book a free
 * slot. A slot never has two live bookings: `Booking.activeSlotId` is unique
 * and only set while a booking is live, and booking locks the slot row.
 */

export type AppointmentService = 'CONSULTING' | 'SERVICE_DESK';

/** URL segment <-> service. */
export const serviceBySlug: Record<string, AppointmentService> = {
  consulting: 'CONSULTING',
  'service-desk': 'SERVICE_DESK',
};
export const slugByService: Record<AppointmentService, string> = {
  CONSULTING: 'consulting',
  SERVICE_DESK: 'service-desk',
};

/**
 * OQ-BD-14 safe defaults: upcoming live bookings a member may hold per
 * service, and how far ahead the public page lists free slots.
 */
export const MAX_UPCOMING_BOOKINGS_PER_SERVICE = 3;
export const PUBLIC_WINDOW_DAYS = 30;

const LIVE: ('BOOKED' | 'DONE' | 'NO_SHOW')[] = ['BOOKED', 'DONE', 'NO_SHOW'];

// ---------------------------------------------------------------------------
// Staff photos: stored as `staff/<uuid>.webp` (+ `-sm`); the uuid is the URL
// id, so a replaced photo gets a new address and can be cached for a long time.
// ---------------------------------------------------------------------------

const PHOTO_AREA = 'staff';
const photoKeyPattern = /^staff\/([0-9a-f-]{36})\.webp$/;

/** Public address of a staff photo, or null when there is none. */
export function staffPhotoUrl(photoKey: string | null, variant: ImageVariant = 'sm') {
  const id = photoKey?.match(photoKeyPattern)?.[1];
  return id ? `/staff-photo/${id}/${variant}` : null;
}

/** Storage key behind a public photo address: only photos of active staff are served. */
export async function getPublicStaffPhotoKey(photoId: string): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/.test(photoId)) return null;
  const photoKey = `${PHOTO_AREA}/${photoId}.webp`;
  const staff = await prisma.staffProfile.findFirst({
    where: { photoKey, isActive: true },
    select: { photoKey: true },
  });
  return staff?.photoKey ?? null;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** Active staff of a service with their free upcoming slots, soonest first. */
export async function listStaffWithFreeSlots(service: AppointmentService, now = new Date()) {
  const until = new Date(now.getTime() + PUBLIC_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return prisma.staffProfile.findMany({
    where: { service, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      fullName: true,
      title: true,
      bio: true,
      bioHtml: true,
      photoKey: true,
      slots: {
        where: {
          isCancelled: false,
          startsAt: { gt: now, lt: until },
          bookings: { none: { activeSlotId: { not: null } } },
        },
        orderBy: { startsAt: 'asc' },
        select: { id: true, startsAt: true, endsAt: true, location: true },
      },
    },
  });
}

export type SlotAvailability = 'open' | 'taken' | 'past' | 'cancelled';

/** One slot for the booking page, with whether it can still be booked. */
export async function getSlotForBooking(slotId: string, now = new Date()) {
  const slot = await prisma.appointmentSlot.findUnique({
    where: { id: slotId },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      location: true,
      isCancelled: true,
      staff: {
        select: { fullName: true, title: true, service: true, isActive: true, photoKey: true },
      },
      bookings: { where: { activeSlotId: { not: null } }, select: { id: true } },
    },
  });
  if (!slot || !slot.staff.isActive) return null;
  const availability: SlotAvailability = slot.isCancelled
    ? 'cancelled'
    : slot.startsAt <= now
      ? 'past'
      : slot.bookings.length > 0
        ? 'taken'
        : 'open';
  return { ...slot, availability };
}

export const bookingInputSchema = z.object({
  topic: requiredText('موضوع', 200),
  description: optionalText('توضیحات', 2000),
});

export type Booker = {
  id: string;
  phone: string;
  fullName: string | null;
  nationalId: string | null;
  companyName: string | null;
  email: string | null;
  /** From the members domain: may this member book now? */
  access: MemberAccess;
};

export type BookResult =
  | { ok: true; bookingId: string }
  | {
      ok: false;
      reason:
        | 'not-found'
        | 'profile'
        | 'pending'
        | 'rejected'
        | 'taken'
        | 'past'
        | 'cancelled'
        | 'limit'
        | 'overlap';
    };

/**
 * Books a slot for a member. The slot row is locked for the checks and the
 * insert; the unique `activeSlotId` is the last line of defense.
 */
export async function bookSlot(
  slotId: string,
  member: Booker,
  input: z.infer<typeof bookingInputSchema>,
  now = new Date(),
): Promise<BookResult> {
  if (member.access !== 'ok') {
    return { ok: false, reason: member.access === 'incomplete' ? 'profile' : member.access };
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const [locked] = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM appointment_slots WHERE id = ${slotId} FOR UPDATE`;
      if (!locked) return { ok: false, reason: 'not-found' } as const;
      const slot = await tx.appointmentSlot.findUniqueOrThrow({
        where: { id: slotId },
        include: { staff: { select: { service: true, isActive: true } } },
      });
      if (!slot.staff.isActive) return { ok: false, reason: 'not-found' } as const;
      if (slot.isCancelled) return { ok: false, reason: 'cancelled' } as const;
      if (slot.startsAt <= now) return { ok: false, reason: 'past' } as const;
      const taken = await tx.booking.findUnique({ where: { activeSlotId: slotId } });
      if (taken) return { ok: false, reason: 'taken' } as const;

      const upcoming = await tx.booking.findMany({
        where: { memberId: member.id, status: 'BOOKED', slot: { endsAt: { gt: now } } },
        select: {
          slot: { select: { startsAt: true, endsAt: true, staff: { select: { service: true } } } },
        },
      });
      const sameService = upcoming.filter((b) => b.slot.staff.service === slot.staff.service);
      if (sameService.length >= MAX_UPCOMING_BOOKINGS_PER_SERVICE) {
        return { ok: false, reason: 'limit' } as const;
      }
      const overlaps = upcoming.some(
        (b) => b.slot.startsAt < slot.endsAt && slot.startsAt < b.slot.endsAt,
      );
      if (overlaps) return { ok: false, reason: 'overlap' } as const;

      const booking = await tx.booking.create({
        data: {
          slotId,
          activeSlotId: slotId,
          memberId: member.id,
          fullName: member.fullName ?? '',
          phone: member.phone,
          email: member.email,
          nationalId: member.nationalId,
          companyName: member.companyName,
          topic: input.topic,
          description: input.description ?? null,
        },
        select: { id: true },
      });
      return { ok: true, bookingId: booking.id } as const;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { ok: false, reason: 'taken' };
    }
    throw error;
  }
}

/** A member's bookings, newest slot first. */
export async function listMemberBookings(memberId: string) {
  return prisma.booking.findMany({
    where: { memberId },
    orderBy: { slot: { startsAt: 'desc' } },
    select: {
      id: true,
      status: true,
      topic: true,
      slot: {
        select: {
          startsAt: true,
          endsAt: true,
          location: true,
          staff: { select: { fullName: true, service: true } },
        },
      },
    },
  });
}

/** A member may cancel a live booking until its slot starts. Frees the slot. */
export async function cancelBookingByMember(bookingId: string, memberId: string, now = new Date()) {
  const { count } = await prisma.booking.updateMany({
    where: { id: bookingId, memberId, status: 'BOOKED', slot: { startsAt: { gt: now } } },
    data: { status: 'CANCELLED', activeSlotId: null, cancelledAt: now },
  });
  return count === 1;
}

/** The member's own live booking as an .ics file. */
export async function memberBookingIcs(bookingId: string, memberId: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, memberId, status: 'BOOKED' },
    select: {
      id: true,
      topic: true,
      updatedAt: true,
      slot: {
        select: {
          startsAt: true,
          endsAt: true,
          location: true,
          staff: { select: { fullName: true, service: true } },
        },
      },
    },
  });
  if (!booking) return null;
  return buildCalendar(
    [
      {
        uid: `booking-${booking.id}@bdcenter.yazdccima.com`,
        title: `${booking.slot.staff.fullName} — ${booking.topic}`,
        startsAt: booking.slot.startsAt,
        endsAt: booking.slot.endsAt,
        location: booking.slot.location,
        updatedAt: booking.updatedAt,
      },
    ],
    { name: booking.topic },
  );
}

/** Contact details and slot of a booking, for the notifications domain. */
export async function getBookingContact(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      phone: true,
      email: true,
      fullName: true,
      topic: true,
      slot: {
        select: {
          startsAt: true,
          location: true,
          staff: { select: { fullName: true, email: true, mobile: true, service: true } },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Admin: staff profiles
// ---------------------------------------------------------------------------

const intField = (label: string, fallback: number, min: number, max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const text = toLatinDigits(value).trim();
      return text === '' ? fallback : Number(text);
    },
    z
      .number({ invalid_type_error: `${label} باید عدد باشد.` })
      .int(`${label} باید عدد صحیح باشد.`)
      .min(min, `${label} نباید کمتر از ${min} باشد.`)
      .max(max, `${label} نباید بیشتر از ${max} باشد.`),
  );

export const staffInputSchema = z.object({
  service: z.enum(['CONSULTING', 'SERVICE_DESK']),
  fullName: requiredText('نام', 120),
  title: optionalText('سمت یا تخصص', 200),
  // HTML from the rich editor.
  bio: optionalText('معرفی', 200_000),
  email: email(false),
  mobile: mobilePhone,
  isActive: z.preprocess((value) => value === 'on', z.boolean()),
  sortOrder: intField('ترتیب', 0, 0, 10000),
  removePhoto: z.preprocess((value) => value === 'on', z.boolean()),
});

export type StaffInput = z.infer<typeof staffInputSchema>;

export async function listStaffForAdmin() {
  const staff = await prisma.staffProfile.findMany({
    orderBy: [{ service: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      _count: {
        select: { slots: { where: { isCancelled: false, startsAt: { gt: new Date() } } } },
      },
    },
  });
  return staff.map(({ _count, ...profile }) => ({ ...profile, upcomingSlots: _count.slots }));
}

export async function getStaffForAdmin(id: string) {
  return prisma.staffProfile.findUnique({ where: { id } });
}

export type SaveStaffResult =
  { ok: true; id: string } | { ok: false; errors: Record<string, string> };

/**
 * Creates (no id) or updates a staff profile. `photoFile` (an empty file
 * input counts as none) replaces the photo; `input.removePhoto` drops it.
 */
export async function saveStaff(
  id: string | null,
  input: StaffInput,
  photoFile: File | null,
  actorId: string,
): Promise<SaveStaffResult> {
  const newPhoto = photoFile && photoFile.size > 0 ? photoFile : null;
  let photoKey: string | null | undefined = input.removePhoto ? null : undefined;
  if (newPhoto) {
    const problem = checkImageUpload(newPhoto);
    if (problem) return { ok: false, errors: { photo: problem } };
    const stored = await storeImage(PHOTO_AREA, newPhoto);
    if (!stored) return { ok: false, errors: { photo: 'فایل تصویر معتبر نیست.' } };
    photoKey = stored.storageKey;
  }
  const oldPhotoKey = id
    ? (await prisma.staffProfile.findUnique({ where: { id }, select: { photoKey: true } }))
        ?.photoKey
    : null;
  const data = {
    service: input.service,
    fullName: input.fullName,
    title: input.title ?? null,
    bio: richInput(input.bio).text,
    bioHtml: richInput(input.bio).html,
    email: input.email ?? null,
    mobile: input.mobile,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
    ...(photoKey !== undefined ? { photoKey } : {}),
  };
  const staff = id
    ? await prisma.staffProfile.update({ where: { id }, data })
    : await prisma.staffProfile.create({ data });
  await recordAudit({
    actorId,
    action: id ? 'staff.update' : 'staff.create',
    entity: 'StaffProfile',
    entityId: staff.id,
    metadata: { fullName: staff.fullName, service: staff.service },
  });
  if (oldPhotoKey && photoKey !== undefined && oldPhotoKey !== photoKey) {
    await deleteStoredImage(oldPhotoKey);
  }
  return { ok: true, id: staff.id };
}

/** Deletes a profile that never had slots; otherwise it must be deactivated. */
export async function deleteStaff(id: string, actorId: string): Promise<boolean> {
  const slots = await prisma.appointmentSlot.count({ where: { staffId: id } });
  if (slots > 0) return false;
  const staff = await prisma.staffProfile.delete({ where: { id } });
  if (staff.photoKey) await deleteStoredImage(staff.photoKey);
  await recordAudit({
    actorId,
    action: 'staff.delete',
    entity: 'StaffProfile',
    entityId: id,
    metadata: { fullName: staff.fullName },
  });
  return true;
}

// ---------------------------------------------------------------------------
// Admin: slots
// ---------------------------------------------------------------------------

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h! * 60 + m!;
}

const timeOfDay = (label: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? toLatinDigits(value).trim() : value),
    z
      .string({ required_error: `${label} را وارد کنید.` })
      .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, `${label} را به شکل ۱۶:۳۰ وارد کنید.`),
  );

const jalaliDate = (label: string) =>
  requiredText(label, 20).refine(
    (value) => parseJalaliDateTime(value) !== null,
    `${label} را به شکل ۱۴۰۵/۰۷/۱۵ وارد کنید.`,
  );

export const slotInputSchema = z.object({
  date: jalaliDate('تاریخ'),
  startTime: timeOfDay('ساعت شروع'),
  durationMinutes: intField('مدت (دقیقه)', 30, 5, 480),
  location: optionalText('مکان یا توضیح', 200),
});

export const slotSeriesSchema = z
  .object({
    fromDate: jalaliDate('از تاریخ'),
    toDate: jalaliDate('تا تاریخ'),
    weekdays: z
      .array(z.coerce.number().int().min(0).max(6))
      .min(1, 'دست‌کم یک روز هفته را انتخاب کنید.'),
    startTime: timeOfDay('ساعت شروع'),
    endTime: timeOfDay('ساعت پایان'),
    durationMinutes: intField('مدت هر نوبت (دقیقه)', 30, 5, 480),
    location: optionalText('مکان یا توضیح', 200),
  })
  .superRefine((value, ctx) => {
    if (minutesOf(value.endTime) <= minutesOf(value.startTime)) {
      ctx.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'ساعت پایان باید بعد از ساعت شروع باشد.',
      });
    }
  });

/** Largest number of slots one series may create, against typing mistakes. */
export const MAX_SERIES_SLOTS = 300;

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function atTime(dayStart: Date, minutes: number): Date {
  return new Date(dayStart.getTime() + minutes * MINUTE);
}

export type SlotPlan = { startsAt: Date; endsAt: Date; location: string | null };

/**
 * Expands a weekly pattern into concrete slots (Tehran time). `weekday` uses
 * the Persian week: Saturday = 0 ... Friday = 6.
 */
export function planSeries(
  input: z.infer<typeof slotSeriesSchema>,
  weekdayOf: (date: Date) => number,
): SlotPlan[] | 'too-many' | 'bad-range' {
  const from = parseJalaliDateTime(input.fromDate)!;
  const to = parseJalaliDateTime(input.toDate)!;
  if (to < from || to.getTime() - from.getTime() > 366 * DAY) return 'bad-range';
  const start = minutesOf(input.startTime);
  const end = minutesOf(input.endTime);
  const plans: SlotPlan[] = [];
  // Iran has no daylight saving time, so days are exactly 24 hours apart.
  for (let day = from; day <= to; day = new Date(day.getTime() + DAY)) {
    if (!input.weekdays.includes(weekdayOf(day))) continue;
    for (let m = start; m + input.durationMinutes <= end; m += input.durationMinutes) {
      plans.push({
        startsAt: atTime(day, m),
        endsAt: atTime(day, m + input.durationMinutes),
        location: input.location ?? null,
      });
      if (plans.length > MAX_SERIES_SLOTS) return 'too-many';
    }
  }
  return plans;
}

/** Creates slots, skipping any that would overlap an existing live slot of the same person. */
export async function createSlots(staffId: string, plans: SlotPlan[], actorId: string) {
  if (plans.length === 0) return { created: 0, skipped: 0 };
  const first = plans.reduce((a, b) => (a.startsAt < b.startsAt ? a : b)).startsAt;
  const last = plans.reduce((a, b) => (a.endsAt > b.endsAt ? a : b)).endsAt;
  const existing = await prisma.appointmentSlot.findMany({
    where: { staffId, isCancelled: false, startsAt: { lt: last }, endsAt: { gt: first } },
    select: { startsAt: true, endsAt: true },
  });
  const accepted: SlotPlan[] = [];
  for (const plan of plans) {
    const clash = [...existing, ...accepted].some(
      (other) => other.startsAt < plan.endsAt && plan.startsAt < other.endsAt,
    );
    if (!clash) accepted.push(plan);
  }
  const { count } = await prisma.appointmentSlot.createMany({
    data: accepted.map((plan) => ({ staffId, ...plan })),
    skipDuplicates: true,
  });
  await recordAudit({
    actorId,
    action: 'slot.create',
    entity: 'StaffProfile',
    entityId: staffId,
    metadata: { created: count, skipped: plans.length - count },
  });
  return { created: count, skipped: plans.length - count };
}

export function planSingleSlot(input: z.infer<typeof slotInputSchema>): SlotPlan {
  const day = parseJalaliDateTime(input.date)!;
  const start = minutesOf(input.startTime);
  return {
    startsAt: atTime(day, start),
    endsAt: atTime(day, start + input.durationMinutes),
    location: input.location ?? null,
  };
}

/** Upcoming (and the last 7 days') slots of one person, with their live booking. */
export async function listSlotsForAdmin(staffId: string, now = new Date()) {
  return prisma.appointmentSlot.findMany({
    where: { staffId, startsAt: { gt: new Date(now.getTime() - 7 * DAY) } },
    orderBy: { startsAt: 'asc' },
    include: {
      bookings: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, fullName: true, phone: true, topic: true },
      },
    },
  });
}

/**
 * Cancels a slot. A live booking on it is cancelled too; its id is returned
 * so the caller can notify the member.
 */
export async function cancelSlot(slotId: string, actorId: string): Promise<string | null> {
  const bookingId = await prisma.$transaction(async (tx) => {
    await tx.appointmentSlot.update({ where: { id: slotId }, data: { isCancelled: true } });
    const live = await tx.booking.findFirst({
      where: { slotId, status: 'BOOKED' },
      select: { id: true },
    });
    await tx.booking.updateMany({
      where: { slotId, status: 'BOOKED' },
      data: { status: 'CANCELLED', activeSlotId: null, cancelledAt: new Date() },
    });
    return live?.id ?? null;
  });
  await recordAudit({
    actorId,
    action: 'slot.cancel',
    entity: 'AppointmentSlot',
    entityId: slotId,
  });
  return bookingId;
}

/** Deletes a slot that never had a booking; others can only be cancelled. */
export async function deleteSlot(slotId: string, actorId: string): Promise<boolean> {
  const { count } = await prisma.appointmentSlot.deleteMany({
    where: { id: slotId, bookings: { none: {} } },
  });
  if (count === 1) {
    await recordAudit({
      actorId,
      action: 'slot.delete',
      entity: 'AppointmentSlot',
      entityId: slotId,
    });
  }
  return count === 1;
}

// ---------------------------------------------------------------------------
// Admin: bookings
// ---------------------------------------------------------------------------

export const bookingStatusSchema = z.enum(['BOOKED', 'CANCELLED', 'DONE', 'NO_SHOW']);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

/**
 * Moves a booking between statuses. Cancelling frees the slot; reopening a
 * cancelled booking only works while nobody else holds the slot.
 */
export async function setBookingStatus(
  bookingId: string,
  status: BookingStatus,
  actorId: string,
): Promise<{ ok: true; changed: boolean } | { ok: false; reason: 'taken' }> {
  const before = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: { status: true, slotId: true },
  });
  const live = (LIVE as string[]).includes(status);
  try {
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status,
        activeSlotId: live ? before.slotId : null,
        cancelledAt: status === 'CANCELLED' ? new Date() : null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { ok: false, reason: 'taken' };
    }
    throw error;
  }
  await recordAudit({
    actorId,
    action: 'booking.status',
    entity: 'Booking',
    entityId: bookingId,
    metadata: { status },
  });
  return { ok: true, changed: before.status !== status };
}

/** Upcoming live bookings of both services, soonest first. */
export async function listUpcomingBookings(now = new Date(), limit = 100) {
  return prisma.booking.findMany({
    where: { status: 'BOOKED', slot: { endsAt: { gt: now } } },
    orderBy: { slot: { startsAt: 'asc' } },
    take: limit,
    select: {
      id: true,
      status: true,
      fullName: true,
      phone: true,
      companyName: true,
      topic: true,
      description: true,
      createdAt: true,
      slot: {
        select: {
          startsAt: true,
          endsAt: true,
          location: true,
          staff: { select: { id: true, fullName: true, service: true } },
        },
      },
    },
  });
}

export async function countUpcomingBookings(now = new Date()) {
  return prisma.booking.count({ where: { status: 'BOOKED', slot: { endsAt: { gt: now } } } });
}

/** Bookings made per Tehran day, for the statistics dashboard. */
export function countBookingsPerDay(from: Date) {
  return countCreatedPerDay('bookings', from);
}
