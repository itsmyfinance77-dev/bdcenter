import { AdminHeading } from '@/components/admin/ui';
import { ArticleForm } from '../article-form';
import { requireAdmin } from '@/modules/auth/service';

export const metadata = { title: 'مطلب جدید' };

export default async function NewArticlePage() {
  await requireAdmin();
  return (
    <>
      <AdminHeading title="مطلب جدید" />
      <ArticleForm id={null} initial={{ kind: 'NEWS', status: 'DRAFT' }} />
    </>
  );
}
