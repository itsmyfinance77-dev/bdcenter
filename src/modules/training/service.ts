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
  email: string | null;
};

export type EnrollResult =
  { ok: true } | { ok: false; reason: 'not-found' | 'profile' | 'duplicate' | CourseAvailability };

/**
 * Enrolls a member. The course row is locked for the check-and-insert, so two
 * people cannot both take the last seat.
 */
export async function enroll(courseSlug: string, member: Enrollee): Promise<EnrollResult> {
  if (!member.fullName) return { ok: false, reason: 'profile' };
  const membershipTier = await getMembershipTier(member.nationalId ?? undefined);

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
  return prisma.enrollment.findMany({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      createdAt: true,
      course: { select: { slug: true, title: true, startsAt: true, status: true } },
    },
  });
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
    description: optionalText('توضیحات', 20000),
    instructor: optionalText('مدرس', 200),
    location: optionalText('مکان', 200),
    startsAt: jalaliDateTime('زمان شروع'),
    endsAt: jalaliDateTime('زمان پایان'),
    capacity: optionalCapacity,
    enrollmentOpen: z.preprocess((value) => value === 'on', z.boolean()),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
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

export async function getCourseForAdmin(id: string) {
  return prisma.course.findUnique({ where: { id } });
}

export async function saveCourse(
  id: string | null,
  input: CourseInput,
  actorId: string,
): Promise<{ ok: true; id: string } | { ok: false; errors: Record<string, string> }> {
  const clash = await prisma.course.findFirst({
    where: { slug: input.slug, NOT: id ? { id } : undefined },
    select: { id: true },
  });
  if (clash) return { ok: false, errors: { slug: SLUG_TAKEN } };

  const data = {
    title: input.title,
    slug: input.slug,
    description: input.description ?? null,
    instructor: input.instructor ?? null,
    location: input.location ?? null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    capacity: input.capacity ?? null,
    enrollmentOpen: input.enrollmentOpen,
    status: input.status,
  };
  if (id && !(await prisma.course.findUnique({ where: { id }, select: { id: true } }))) {
    return { ok: false, errors: { _form: 'این دوره پیدا نشد.' } };
  }
  const course = id
    ? await prisma.course.update({ where: { id }, data })
    : await prisma.course.create({ data });

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
  const course = await prisma.course.delete({ where: { id }, select: { title: true } });
  await recordAudit({
    actorId,
    action: 'course.delete',
    entity: 'Course',
    entityId: id,
    metadata: { title: course.title },
  });
}

export async function listEnrollments(courseId: string) {
  return prisma.enrollment.findMany({ where: { courseId }, orderBy: { createdAt: 'asc' } });
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
  const enrollment = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status },
    select: { courseId: true },
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
