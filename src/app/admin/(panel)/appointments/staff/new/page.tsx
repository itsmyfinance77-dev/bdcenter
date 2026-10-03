import { AdminHeading } from '@/components/admin/ui';
import { StaffForm } from '../../staff-form';

export const metadata = { title: 'پروفایل جدید' };

export default function NewStaffPage() {
  return (
    <>
      <AdminHeading title="پروفایل جدید مشاور / کارشناس" />
      <StaffForm
        id={null}
        initial={{ service: 'CONSULTING', isActive: 'on', sortOrder: '0' }}
        photoUrl={null}
      />
    </>
  );
}
