import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { servicePageCopy, serviceTiles } from '@/content/site';
import { ConsultingForm } from './consulting-form';

type Params = { slug: string };

function findTile(slug: string) {
  return serviceTiles.find((tile) => tile.slug === slug);
}

export function generateStaticParams(): Params[] {
  return serviceTiles.map((tile) => ({ slug: tile.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const tile = findTile((await params).slug);
  if (!tile) return {};
  return {
    title: tile.title,
    description: 'summary' in tile ? tile.summary : undefined,
    alternates: { canonical: `/services/${tile.slug}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<Params> }) {
  const tile = findTile((await params).slug);
  if (!tile) notFound();
  if ('href' in tile) redirect(tile.href);

  const crumbs = [{ title: 'خدمات', href: '/#services-heading' }, { title: tile.title }];

  if (tile.slug === 'consulting') {
    return (
      <>
        <PageHeader title={tile.title} lead={servicePageCopy.consulting} crumbs={crumbs} />
        <div className="mx-auto max-w-3xl px-4 py-12">
          <section
            aria-labelledby="consulting-form-heading"
            className="rounded-panel border border-line bg-white p-6"
          >
            <h2 id="consulting-form-heading" className="mb-4 text-lg font-bold text-brand-900">
              ثبت درخواست مشاوره
            </h2>
            <ConsultingForm />
          </section>
        </div>
      </>
    );
  }

  // OQ-BD-06: content for the remaining tiles has not arrived yet.
  return (
    <>
      <PageHeader title={tile.title} crumbs={crumbs} />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="rounded-panel border border-line bg-white p-6 text-sm text-ink-2">
          {servicePageCopy.placeholder}
        </p>
      </div>
    </>
  );
}
