import { AdminHeading } from '@/components/admin/ui';
import { CourseForm } from '../course-form';
import { requireAdmin } from '@/modules/auth/service';

export const metadata = { title: 'دوره جدید' };

export default async function NewCoursePage() {
  await requireAdmin();
  return (
    <>
      <AdminHeading title="دوره جدید" />
      <CourseForm id={null} initial={{ status: 'DRAFT', enrollmentOpen: 'on' }} />
    </>
  );
}
