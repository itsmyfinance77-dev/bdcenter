import { notFound } from 'next/navigation';
import { InstitutionalPage } from '@/components/institutional-page';
import { decodeParam } from '@/lib/params';
import { richHtmlToText } from '@/lib/rich-html';
import { getPageForAdmin } from '@/modules/pages/service';
import { getContactInfo } from '@/modules/settings/service';

/** A page of any status (or a built-in page's unsaved draft) as the site would show it. */
export default async function PagePreview({ params }: { params: Promise<{ slug: string }> }) {
  const slug = decodeParam((await params).slug);
  const [page, contact] = await Promise.all([getPageForAdmin(slug), getContactInfo()]);
  if (!page) notFound();
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
