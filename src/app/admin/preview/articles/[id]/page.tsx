import { ArticlePreview } from '@/components/article-page';
import { requireAdmin } from '@/modules/auth/service';

export default async function ArticlePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  return <ArticlePreview id={(await params).id} />;
}
