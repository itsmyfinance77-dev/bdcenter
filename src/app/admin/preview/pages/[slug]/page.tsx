import { notFound } from 'next/navigation';
import { InstitutionalPage } from '@/components/institutional-page';
import { decodeParam } from '@/lib/params';
import { richHtmlToText } from '@/lib/rich-html';
import { getPageForAdmin, getPageRevision } from '@/modules/pages/service';
import { getContactInfo } from '@/modules/settings/service';

/** A page of any status (or a built-in page's unsaved draft) as the site would show it. */
export default async function PagePreview({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ revision?: string }>;
}) {
  const slug = decodeParam((await params).slug);
  const { revision: revisionId } = await searchParams;
  const [current, contact] = await Promise.all([getPageForAdmin(slug), getContactInfo()]);
  // `?revision=` shows an earlier version from the page's history.
  const revision = revisionId ? await getPageRevision(slug, revisionId) : null;
  if (!current || (revisionId && !revision)) notFound();
  const page = revision
    ? {
        title: revision.title,
        html: revision.html,
        seoDesc: revision.seoDesc ?? '',
        updatedAt: revision.createdAt,
      }
    : current;
  return (
    <InstitutionalPage
      title={page.title}
      page={{
        title: page.title,
        format: 'html',
        body: page.html,
        text: richHtmlToText(page.html),
        seoDesc: page.seoDesc || null,
        updatedAt: page.updatedAt,
      }}
      aboutLayout={slug === 'about'}
      address={contact.address}
    />
  );
}
