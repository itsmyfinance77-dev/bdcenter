import type { Metadata } from 'next';
import { ArticleIndexPage } from '@/components/article-page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'رویدادها',
  description: 'رویدادهای فناورانه و نشست‌های تخصصی مرکز توسعه کسب‌وکار اتاق بازرگانی یزد.',
  alternates: { canonical: '/events' },
};

export default function Page() {
  return <ArticleIndexPage kind="EVENT" />;
}
