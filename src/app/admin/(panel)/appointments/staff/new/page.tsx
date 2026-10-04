import { AdminHeading } from '@/components/admin/ui';
import { StaffForm } from '../../staff-form';
import { requireAdmin } from '@/modules/auth/service';

export const metadata = { title: 'پروفایل جدید' };

export default async function NewStaffPage() {
  await requireAdmin();
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
