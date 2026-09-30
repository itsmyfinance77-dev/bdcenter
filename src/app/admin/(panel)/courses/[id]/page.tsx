import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConfirmButton } from '@/components/admin/confirm-button';
import { StatusForm } from '@/components/admin/status-form';
import { AdminHeading, EmptyState, secondaryButtonClass, Table, Td } from '@/components/admin/ui';
import { membershipTierLabel } from '@/content/admin';
import { formatDateTime, formatNumber, toPersianDigits } from '@/lib/format';
import { formatJalaliInput } from '@/lib/jalali';
import { getCourseForAdmin, listEnrollments } from '@/modules/training/service';
import { deleteCourseAction, setEnrollmentStatusAction } from '../actions';
import { CourseForm } from '../course-form';

export const metadata = { title: 'ویرایش دوره' };

export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const course = await getCourseForAdmin(id);
  if (!course) notFound();
  const enrollments = await listEnrollments(course.id);

  const initial = {
    status: course.status,
    enrollmentOpen: course.enrollmentOpen ? 'on' : '',
    title: course.title,
    slug: course.slug,
    description: course.description ?? '',
    instructor: course.instructor ?? '',
    location: course.location ?? '',
    startsAt: course.startsAt ? formatJalaliInput(course.startsAt) : '',
    endsAt: course.endsAt ? formatJalaliInput(course.endsAt) : '',
    capacity: course.capacity === null ? '' : String(course.capacity),
  };

  return (
    <>
      <AdminHeading title="ویرایش دوره">
        {course.status === 'PUBLISHED' ? (
          <Link href={`/courses/${course.slug}`} target="_blank" className={secondaryButtonClass}>
            مشاهده در سایت
          </Link>
        ) : null}
        <ConfirmButton
          action={deleteCourseAction.bind(null, course.id)}
          message={`«${course.title}» و همه ثبت‌نام‌هایش (${formatNumber(enrollments.length)} مورد) برای همیشه حذف شود؟`}
        >
          حذف
        </ConfirmButton>
      </AdminHeading>
      {saved ? (
        <p
          role="status"
          className="mb-4 rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
        >
          ذخیره شد.
        </p>
      ) : null}
      <CourseForm key={course.updatedAt.toISOString()} id={course.id} initial={initial} />

      <section aria-labelledby="enrollments-heading" className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="enrollments-heading" className="text-lg font-bold text-brand-900">
            ثبت‌نام‌ها ({formatNumber(enrollments.length)})
          </h2>
          {enrollments.length > 0 ? (
            <a href={`/admin/courses/${course.id}/export`} className={secondaryButtonClass}>
              خروجی Excel (CSV)
            </a>
          ) : null}
        </div>
        {enrollments.length === 0 ? (
          <EmptyState>هنوز کسی ثبت‌نام نکرده است.</EmptyState>
        ) : (
          <Table head={['نام', 'تماس', 'سطح عضویت', 'تاریخ', 'وضعیت']}>
            {enrollments.map((enrollment) => (
              <tr key={enrollment.id}>
                <Td>
                  <span className="font-medium">{enrollment.fullName}</span>
                  {enrollment.companyName ? (
                    <p className="text-xs text-ink-2">{enrollment.companyName}</p>
                  ) : null}
                  {enrollment.nationalId ? (
                    <p className="text-xs text-ink-2">
                      کد ملی: {toPersianDigits(enrollment.nationalId)}
                    </p>
                  ) : null}
                </Td>
                <Td>
                  <span dir="ltr">{toPersianDigits(enrollment.phone)}</span>
                  {enrollment.email ? (
                    <p className="text-xs text-ink-2" dir="ltr">
                      {enrollment.email}
                    </p>
                  ) : null}
                </Td>
                <Td>
                  {enrollment.membershipTier ? membershipTierLabel[enrollment.membershipTier] : '—'}
                </Td>
                <Td>{formatDateTime(enrollment.createdAt)}</Td>
                <Td>
                  <StatusForm
                    action={setEnrollmentStatusAction.bind(null, enrollment.id)}
                    current={enrollment.status}
                  />
                </Td>
              </tr>
            ))}
          </Table>
        )}
        <p className="mt-2 text-xs text-ink-2">
          ثبت‌نام‌های «رد شده» جزو ظرفیت حساب نمی‌شوند. سطح عضویت فقط برای اطلاع است (OQ-BD-01).
        </p>
      </section>
    </>
  );
}
