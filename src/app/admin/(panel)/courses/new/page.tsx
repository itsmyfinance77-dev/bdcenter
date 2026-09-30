import { AdminHeading } from '@/components/admin/ui';
import { CourseForm } from '../course-form';

export const metadata = { title: 'دوره جدید' };

export default function NewCoursePage() {
  return (
    <>
      <AdminHeading title="دوره جدید" />
      <CourseForm id={null} initial={{ status: 'DRAFT', enrollmentOpen: 'on' }} />
    </>
  );
}
