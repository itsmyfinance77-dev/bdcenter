import { ArticlePreview } from '@/components/article-page';

export default async function ArticlePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  return <ArticlePreview id={(await params).id} />;
}
