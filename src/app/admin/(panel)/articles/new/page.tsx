import { AdminHeading } from '@/components/admin/ui';
import { ArticleForm } from '../article-form';

export const metadata = { title: 'مطلب جدید' };

export default function NewArticlePage() {
  return (
    <>
      <AdminHeading title="مطلب جدید" />
      <ArticleForm id={null} initial={{ kind: 'NEWS', status: 'DRAFT' }} />
    </>
  );
}
