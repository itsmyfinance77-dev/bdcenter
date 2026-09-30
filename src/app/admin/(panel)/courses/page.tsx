import Link from 'next/link';
import { AdminHeading, Badge, ButtonLink, EmptyState, Table, Td } from '@/components/admin/ui';
import { contentStatusLabel } from '@/content/admin';
import { formatDateTime, formatNumber } from '@/lib/format';
import { listCoursesForAdmin } from '@/modules/training/service';

export const metadata = { title: 'دوره‌های آموزشی' };

export default async function CoursesAdminPage() {
  const courses = await listCoursesForAdmin();

  return (
    <>
      <AdminHeading title="دوره‌های آموزشی">
        <ButtonLink href="/admin/courses/new">دوره جدید</ButtonLink>
      </AdminHeading>
      {courses.length === 0 ? (
        <EmptyState>هنوز دوره‌ای ثبت نشده است.</EmptyState>
      ) : (
        <Table head={['عنوان', 'وضعیت', 'ثبت‌نام', 'ثبت‌نام‌شده / ظرفیت', 'شروع']}>
          {courses.map((course) => (
            <tr key={course.id}>
              <Td>
                <Link
                  href={`/admin/courses/${course.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {course.title}
                </Link>
              </Td>
              <Td>
                <Badge tone={course.status}>{contentStatusLabel[course.status]}</Badge>
              </Td>
              <Td>{course.enrollmentOpen ? 'باز' : 'بسته'}</Td>
              <Td>
                {formatNumber(course.taken)} /{' '}
                {course.capacity === null ? 'نامحدود' : formatNumber(course.capacity)}
              </Td>
              <Td>{course.startsAt ? formatDateTime(course.startsAt) : '—'}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
