import { AdminHeading } from '@/components/admin/ui';
import { PageForm } from '../page-form';
import { requireAdmin } from '@/modules/auth/service';

export const metadata = { title: 'صفحه جدید' };

export default async function NewPagePage() {
  await requireAdmin();
  return (
    <>
      <AdminHeading title="صفحه جدید" />
      <PageForm slug={null} isSystem={false} initial={{ status: 'DRAFT' }} />
    </>
  );
}
