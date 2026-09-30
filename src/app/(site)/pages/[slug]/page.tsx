import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InstitutionalPage } from '@/components/institutional-page';
import { plainExcerpt } from '@/lib/text';
import { decodeParam } from '@/lib/params';
import { getPublishedPage, systemPage } from '@/modules/pages/service';

export const dynamic = 'force-dynamic';

type Params = { slug: string };

/** Custom pages only; built-in ones have their own addresses (/about, /privacy, /terms). */
async function load(params: Promise<Params>) {
  const slug = decodeParam((await params).slug);
  if (systemPage(slug)) return null;
  const page = await getPublishedPage(slug);
  return page ? { slug, page } : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const found = await load(params);
  if (!found) return {};
  return {
    title: found.page.title,
    description: found.page.seoDesc ?? plainExcerpt(found.page.body),
    alternates: { canonical: `/pages/${found.slug}` },
  };
}

export default async function CustomPage({ params }: { params: Promise<Params> }) {
  const found = await load(params);
  if (!found) notFound();
  return <InstitutionalPage title={found.page.title} page={found.page} />;
}
