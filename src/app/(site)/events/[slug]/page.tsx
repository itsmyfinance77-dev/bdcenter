import type { Metadata } from 'next';
import { ArticleDetailPage, articleMetadata } from '@/components/article-page';
import { decodeParam } from '@/lib/params';

export const dynamic = 'force-dynamic';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  return articleMetadata('EVENT', decodeParam((await params).slug));
}

export default async function Page({ params }: { params: Promise<Params> }) {
  return <ArticleDetailPage kind="EVENT" slug={decodeParam((await params).slug)} />;
}
