import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { aboutText, siteInfo } from '@/content/site';

export const metadata: Metadata = {
  title: 'درباره مرکز',
  description: aboutText.slice(0, 160),
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="درباره مرکز"
        lead={siteInfo.parentOrg}
        crumbs={[{ title: 'درباره مرکز' }]}
      />
      <article className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-justify text-base leading-8 text-ink">{aboutText}</p>
      </article>
    </>
  );
}
