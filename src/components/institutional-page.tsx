import type { Metadata } from 'next';
import { MarkdownBody } from '@/components/markdown';
import { PageHeader } from '@/components/page-header';
import { pageCopy } from '@/content/pages';
import { formatDate } from '@/lib/format';
import { plainExcerpt } from '@/lib/text';
import {
  getSystemPageContent,
  pagePath,
  systemPage,
  type PublicPage,
} from '@/modules/pages/service';

/** Shared rendering for admin-edited pages (built-in and custom). */
export function InstitutionalPage({
  title,
  page,
  lead,
}: {
  title: string;
  page: PublicPage | null;
  lead?: string;
}) {
  const heading = page?.title ?? title;
  return (
    <>
      <PageHeader title={heading} lead={lead} crumbs={[{ title: heading }]} />
      <article className="mx-auto max-w-3xl px-4 py-12">
        {page ? (
          <>
            <MarkdownBody source={page.body} />
            {page.updatedAt ? (
              <p className="mt-10 text-xs text-ink-2">
                آخرین به‌روزرسانی: {formatDate(page.updatedAt)}
              </p>
            ) : null}
          </>
        ) : (
          <p className="rounded-panel border border-line bg-white p-6 text-sm text-ink-2">
            {pageCopy.preparing}
          </p>
        )}
      </article>
    </>
  );
}

/** Metadata for a built-in page; the description falls back to the body's start. */
export async function systemPageMetadata(slug: string): Promise<Metadata> {
  const definition = systemPage(slug)!;
  const page = await getSystemPageContent(slug);
  return {
    title: page?.title ?? definition.title,
    description: page ? (page.seoDesc ?? plainExcerpt(page.body)) : undefined,
    alternates: { canonical: pagePath(slug) },
  };
}
