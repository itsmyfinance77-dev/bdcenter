import { AdminHeading } from '@/components/admin/ui';
import { PageForm } from '../page-form';

export const metadata = { title: 'صفحه جدید' };

export default function NewPagePage() {
  return (
    <>
      <AdminHeading title="صفحه جدید" />
      <PageForm slug={null} isSystem={false} initial={{ status: 'DRAFT' }} />
    </>
  );
}
