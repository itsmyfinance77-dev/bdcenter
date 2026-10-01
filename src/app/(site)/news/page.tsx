import type { Metadata } from 'next';
import { ArticleIndexPage } from '@/components/article-page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'اخبار',
  description: 'اخبار و رویدادهای مرکز توسعه کسب‌وکار اتاق بازرگانی یزد.',
  alternates: { canonical: '/news' },
};

/** `?view=all` lists news and events together (the "همه" tab). */
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return <ArticleIndexPage kind={view === 'all' ? 'ALL' : 'NEWS'} />;
}
