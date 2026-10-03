import { z } from 'zod';
import { membershipTierLabel, requestStatusLabel } from '@/content/admin';
import { toCsv } from '@/lib/csv';
import { formatDateTime } from '@/lib/format';
import { jalaliDateTime } from '@/lib/jalali';
import { prisma, Prisma } from '@/lib/prisma';
import { allTermsIn, matchesAllTerms, SqlParams } from '@/lib/search-text';
import { SLUG_ERROR, SLUG_TAKEN, slugify, slugPattern } from '@/lib/slug';
import { optionalText, requiredText, toLatinDigits } from '@/lib/validation';
import { recordAudit } from '@/modules/audit/service';
import { getMembershipTier } from '@/modules/membership/service';
import { countCreatedPerDay } from '@/lib/daily-counts';
import { richInput } from '@/lib/rich-html';
import { certificateAvailable, syncCertificate } from './certificates';
import type { MemberAccess } from '@/modules/members/access';
import {
  checkImageUpload,
  deleteStoredImage,
  storeImage,
  type ImageVariant,
} from '@/modules/files/service';

/**
 * Training courses and on-site enrollment (ADR-0002). Enrolling needs a
 * signed-in member; the member's profile is copied onto the enrollment so the
 * record stays readable even if the profile changes later. No price is
 * computed — the membership tier is only recorded (OQ-BD-01).
 */

/** Enrollments that still hold a seat. */
const seatHolding = { status: { not: 'REJECTED' as const } };

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export async function listPublishedCourses() {
  const courses = await prisma.course.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ startsAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      instructor: true,
      location: true,
      startsAt: true,
      coverKey: true,
      capacity: true,
      enrollmentOpen: true,
      _count: { select: { enrollments: { where: seatHolding } } },
    },
  });
  return courses.map(({ _count, ...course }) => ({
    ...course,
    availability: availability(course, _count.enrollments),
  }));
}

export type CourseAvailability = 'open' | 'full' | 'closed' | 'started';

function availability(
  course: { enrollmentOpen: boolean; capacity: number | null; startsAt: Date | null },
  taken: number,
): CourseAvailability {
  if (!course.enrollmentOpen) return 'closed';
  if (course.startsAt && course.startsAt <= new Date()) return 'started';
  if (course.capacity !== null && taken >= course.capacity) return 'full';
  return 'open';
}

export async function getPublishedCourse(slug: string) {
  const course = await prisma.course.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: { _count: { select: { enrollments: { where: seatHolding } } } },
  });
  if (!course) return null;
  const { _count, ...rest } = course;
  const taken = _count.enrollments;
  return {
    ...rest,
    availability: availability(course, taken),
    seatsLeft: course.capacity === null ? null : Math.max(0, course.capacity - taken),
  };
}

/** Published courses matching every search term; title hits first, then newest. */
export async function searchPublishedCourses(terms: string[], limit = 20) {
  if (terms.length === 0) return [];
  const params = new SqlParams();
  const where = matchesAllTerms(['title', 'description', 'instructor', 'location'], terms, params);
  return prisma.$queryRawUnsafe<
    { slug: string; title: string; instructor: string | null; startsAt: Date | null }[]
  >(
    `SELECT slug, title, instructor, "startsAt" FROM courses
     WHERE status = 'PUBLISHED' AND ${where}
     ORDER BY ${allTermsIn('title', terms, params)} DESC, "startsAt" DESC NULLS LAST
     LIMIT ${params.add(limit)}`,
    ...params.values,
  );
}

/** Published courses starting in [from, to), soonest first (calendar and feed). */
export async function listPublishedCoursesBetween(from: Date, to: Date, limit = 500) {
  return prisma.course.findMany({
    where: { status: 'PUBLISHED', startsAt: { gte: from, lt: to } },
    orderBy: { startsAt: 'asc' },
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      location: true,
      updatedAt: true,
    },
  });
}

export async function listPublishedCourseUrls() {
  return prisma.course.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true },
  });
}

// ---------------------------------------------------------------------------
// Member: enroll, list, cancel
// ---------------------------------------------------------------------------

export type Enrollee = {
  id: string;
  phone: string;
  fullName: string | null;
  nationalId: string | null;
  companyName: string | null;
  /** A legal entity's شناسه ملی: the membership roster is looked up by it first. */
  legalNationalId: string | null;
  email: string | null;
  /** From the members domain: may this member enroll now? */
  access: MemberAccess;
};

export type EnrollResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'not-found' | 'profile' | 'pending' | 'rejected' | 'duplicate' | CourseAvailability;
    };

/**
 * Enrolls a member. The course row is locked for the check-and-insert, so two
 * people cannot both take the last seat.
 */
export async function enroll(courseSlug: string, member: Enrollee): Promise<EnrollResult> {
  if (member.access !== 'ok') {
    return { ok: false, reason: member.access === 'incomplete' ? 'profile' : member.access };
  }
  const membershipTier = await getMembershipTier(
    member.legalNationalId ?? member.nationalId ?? undefined,
  );

  try {
    return await prisma.$transaction(async (tx) => {
      const [locked] = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM courses WHERE slug = ${courseSlug} AND status = 'PUBLISHED' FOR UPDATE`;
      if (!locked) return { ok: false, reason: 'not-found' } as const;

      const course = await tx.course.findUniqueOrThrow({ where: { id: locked.id } });
      const existing = await tx.enrollment.findUnique({
        where: { courseId_memberId: { courseId: course.id, memberId: member.id } },
        select: { id: true },
      });
      if (existing) return { ok: false, reason: 'duplicate' } as const;
      const taken = await tx.enrollment.count({ where: { courseId: course.id, ...seatHolding } });
      const state = availability(course, taken);
      if (state !== 'open') return { ok: false, reason: state } as const;

      await tx.enrollment.create({
        data: {
          courseId: course.id,
          memberId: member.id,
          fullName: member.fullName ?? '',
          nationalId: member.nationalId,
          phone: member.phone,
          email: member.email,
          companyName: member.companyName,
          membershipTier,
        },
      });
      return { ok: true } as const;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { ok: false, reason: 'duplicate' };
    }
    throw error;
  }
}

export async function getMemberEnrollment(courseId: string, memberId: string) {
  return prisma.enrollment.findUnique({
    where: { courseId_memberId: { courseId, memberId } },
    select: { id: true, status: true },
  });
}

export async function listMemberEnrollments(memberId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      createdAt: true,
      course: {
        select: {
          slug: true,
          title: true,
          startsAt: true,
          endsAt: true,
          location: true,
          status: true,
          certificateEnabled: true,
        },
      },
      certificate: { select: { revokedAt: true } },
    },
  });
  return enrollments.map((enrollment) => ({
    ...enrollment,
    hasCertificate: certificateAvailable(enrollment),
  }));
}

/** A member may withdraw while the enrollment has not been reviewed yet. */
export async function cancelEnrollment(enrollmentId: string, memberId: string) {
  const { count } = await prisma.enrollment.deleteMany({
    where: { id: enrollmentId, memberId, status: 'NEW' },
  });
  return count === 1;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const optionalCapacity = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const text = toLatinDigits(value).trim();
    return text === '' ? undefined : Number(text);
  },
  z
    .number({ invalid_type_error: 'ظرفیت باید عدد باشد.' })
    .int('ظرفیت باید عدد صحیح باشد.')
    .min(1, 'ظرفیت باید حداقل ۱ باشد.')
    .max(100000)
    .optional(),
);

export const courseInputSchema = z
  .object({
    title: requiredText('عنوان', 200),
    slug: optionalText('نامک', 120),
    // HTML from the rich editor.
    description: optionalText('توضیحات', 500_000),
    instructor: optionalText('مدرس', 200),
    location: optionalText('مکان', 200),
    startsAt: jalaliDateTime('زمان شروع'),
    endsAt: jalaliDateTime('زمان پایان'),
    capacity: optionalCapacity,
    enrollmentOpen: z.preprocess((value) => value === 'on', z.boolean()),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
    certificateEnabled: z.preprocess((value) => value === 'on', z.boolean()),
    certificateSignatory: optionalText('نام امضاکننده', 120),
    certificateSignatoryTitle: optionalText('سمت امضاکننده', 160),
    coverAlt: optionalText('توضیح عکس', 200),
    removeCover: z.preprocess((value) => value === 'on', z.boolean()),
  })
  .transform((value) => ({
    ...value,
    slug: value.slug ? slugify(value.slug) : slugify(value.title),
  }))
  .superRefine((value, ctx) => {
    if (!slugPattern.test(value.slug)) {
      ctx.addIssue({ code: 'custom', path: ['slug'], message: SLUG_ERROR });
    }
    if (value.startsAt && value.endsAt && value.endsAt < value.startsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'زمان پایان باید بعد از زمان شروع باشد.',
      });
    }
  });

export type CourseInput = z.infer<typeof courseInputSchema>;

export async function listCoursesForAdmin() {
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { enrollments: { where: seatHolding } } } },
  });
  return courses.map(({ _count, ...course }) => ({ ...course, taken: _count.enrollments }));
}

/** Courses with how many people a group SMS would reach (accepted / all live enrollments). */
export async function listCourseAudiences() {
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      title: true,
      enrollments: { where: { status: { not: 'REJECTED' } }, select: { status: true } },
    },
  });
  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    all: course.enrollments.length,
    accepted: course.enrollments.filter((e) => e.status === 'ACCEPTED' || e.status === 'DONE')
      .length,
  }));
}

/** Phones of a course's enrollees, for a group SMS: accepted (and done) only, or everyone not rejected. */
export async function listCourseEnrollmentPhones(courseId: string, scope: 'accepted' | 'all') {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      title: true,
      enrollments: {
        where:
          scope === 'accepted'
            ? { status: { in: ['ACCEPTED', 'DONE'] } }
            : { status: { not: 'REJECTED' } },
        select: { phone: true },
      },
    },
  });
  if (!course) return null;
  return { title: course.title, phones: course.enrollments.map((e) => e.phone) };
}

export async function getCourseForAdmin(id: string) {
  return prisma.course.findUnique({ where: { id } });
}

// ---------------------------------------------------------------------------
// Course covers: `course-covers/<uuid>.webp` (+ `-sm`); the uuid is the public
// address, so a replaced cover gets a new one and caches well.
// ---------------------------------------------------------------------------

const COVER_AREA = 'course-covers';
const coverKeyPattern = /^course-covers\/([0-9a-f-]{36})\.webp$/;

export function courseCoverUrl(coverKey: string | null, variant: ImageVariant = 'lg') {
  const id = coverKey?.match(coverKeyPattern)?.[1];
  return id ? `/course-cover/${id}/${variant}` : null;
}

/** Storage key behind a public cover address: only covers of published courses. */
export async function getPublicCourseCoverKey(coverId: string): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/.test(coverId)) return null;
  const coverKey = `${COVER_AREA}/${coverId}.webp`;
  const course = await prisma.course.findFirst({
    where: { coverKey, status: 'PUBLISHED' },
    select: { coverKey: true },
  });
  return course?.coverKey ?? null;
}

/**
 * Creates (no id) or updates a course. `coverFile` (an empty file input counts
 * as none) replaces the cover; `input.removeCover` drops it.
 */
export async function saveCourse(
  id: string | null,
  input: CourseInput,
  actorId: string,
  coverFile: File | null = null,
): Promise<{ ok: true; id: string } | { ok: false; errors: Record<string, string> }> {
  const newCover = coverFile && coverFile.size > 0 ? coverFile : null;
  if (newCover) {
    const problem = checkImageUpload(newCover);
    if (problem) return { ok: false, errors: { coverImage: problem } };
  }
  const clash = await prisma.course.findFirst({
    where: { slug: input.slug, NOT: id ? { id } : undefined },
    select: { id: true },
  });
  if (clash) return { ok: false, errors: { slug: SLUG_TAKEN } };

  const description = richInput(input.description);
  const data = {
    title: input.title,
    slug: input.slug,
    description: description.text,
    descriptionHtml: description.html,
    instructor: input.instructor ?? null,
    location: input.location ?? null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    capacity: input.capacity ?? null,
    enrollmentOpen: input.enrollmentOpen,
    status: input.status,
    certificateEnabled: input.certificateEnabled,
    certificateSignatory: input.certificateSignatory ?? null,
    certificateSignatoryTitle: input.certificateSignatoryTitle ?? null,
    coverAlt: input.coverAlt ?? null,
  };
  const existing = id
    ? await prisma.course.findUnique({ where: { id }, select: { coverKey: true } })
    : null;
  if (id && !existing) return { ok: false, errors: { _form: 'این دوره پیدا نشد.' } };

  const oldCover = existing?.coverKey ?? null;
  let coverKey = input.removeCover ? null : oldCover;
  if (newCover) {
    const stored = await storeImage(COVER_AREA, newCover);
    if (!stored) return { ok: false, errors: { coverImage: 'فایل تصویر معتبر نیست.' } };
    coverKey = stored.storageKey;
  }
  const course = id
    ? await prisma.course.update({ where: { id }, data: { ...data, coverKey } })
    : await prisma.course.create({ data: { ...data, coverKey } });
  if (oldCover && oldCover !== coverKey) await deleteStoredImage(oldCover);

  await recordAudit({
    actorId,
    action: id ? 'course.update' : 'course.create',
    entity: 'Course',
    entityId: course.id,
    metadata: { title: course.title, status: course.status },
  });
  return { ok: true, id: course.id };
}

/** Deletes a course together with its enrollments. */
export async function deleteCourse(id: string, actorId: string) {
  const course = await prisma.course.delete({
    where: { id },
    select: { title: true, coverKey: true },
  });
  if (course.coverKey) await deleteStoredImage(course.coverKey);
  await recordAudit({
    actorId,
    action: 'course.delete',
    entity: 'Course',
    entityId: id,
    metadata: { title: course.title },
  });
}

export async function listEnrollments(courseId: string) {
  return prisma.enrollment.findMany({
    where: { courseId },
    orderBy: { createdAt: 'asc' },
    include: { certificate: { select: { code: true, revokedAt: true } } },
  });
}

export const enrollmentStatusSchema = z.enum(['NEW', 'IN_REVIEW', 'ACCEPTED', 'REJECTED', 'DONE']);

export async function setEnrollmentStatus(
  enrollmentId: string,
  status: z.infer<typeof enrollmentStatusSchema>,
  actorId: string,
) {
  const before = await prisma.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    select: { status: true },
  });
  // The certificate follows the status: issued on DONE, revoked otherwise.
  const enrollment = await prisma.$transaction(async (tx) => {
    const updated = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { status },
      select: { courseId: true },
    });
    await syncCertificate(tx, enrollmentId);
    return updated;
  });
  await recordAudit({
    actorId,
    action: 'enrollment.status',
    entity: 'Enrollment',
    entityId: enrollmentId,
    metadata: { status },
  });
  return { courseId: enrollment.courseId, changed: before.status !== status };
}

/** Who to tell about an enrollment's status, for the notifications domain. */
export async function getEnrollmentContact(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { phone: true, email: true, course: { select: { title: true } } },
  });
  return enrollment
    ? { phone: enrollment.phone, email: enrollment.email, courseTitle: enrollment.course.title }
    : null;
}

/**
 * Accepted enrollments in published courses that start between `from` and
 * `to`, for the reminders domain.
 */
export async function listAcceptedEnrollmentsStartingBetween(from: Date, to: Date, limit = 3000) {
  return prisma.enrollment.findMany({
    where: {
      status: 'ACCEPTED',
      course: { status: 'PUBLISHED', startsAt: { gte: from, lte: to } },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      phone: true,
      email: true,
      course: { select: { title: true, startsAt: true, location: true } },
    },
  });
}

export async function exportEnrollmentsCsv(courseId: string, actorId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return null;
  const enrollments = await listEnrollments(courseId);
  const rows = enrollments.map((e) => [
    formatDateTime(e.createdAt),
    requestStatusLabel[e.status],
    e.fullName,
    e.phone,
    e.nationalId ?? '',
    e.companyName ?? '',
    e.email ?? '',
    e.membershipTier ? membershipTierLabel[e.membershipTier] : '',
  ]);
  await recordAudit({
    actorId,
    action: 'enrollment.export',
    entity: 'Course',
    entityId: courseId,
    metadata: { rows: rows.length },
  });
  return {
    filename: `${course.slug}-enrollments.csv`,
    content: toCsv([
      ['تاریخ ثبت', 'وضعیت', 'نام', 'تلفن', 'کد/شناسه ملی', 'شرکت', 'ایمیل', 'سطح عضویت'],
      ...rows,
    ]),
  };
}

export async function countNewEnrollments() {
  return prisma.enrollment.count({ where: { status: 'NEW' } });
}

/** Enrollments per Tehran day, for the statistics dashboard. */
export function countEnrollmentsPerDay(from: Date) {
  return countCreatedPerDay('enrollments', from);
}
