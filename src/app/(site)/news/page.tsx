import type { Metadata } from 'next';
import { ArticleIndexPage } from '@/components/article-page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'اخبار',
  description: 'اخبار مرکز توسعه کسب‌وکار اتاق بازرگانی یزد.',
  alternates: { canonical: '/news' },
};

export default function Page() {
  return <ArticleIndexPage kind="NEWS" />;
}
