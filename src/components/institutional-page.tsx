import type { Metadata } from 'next';
import Image from 'next/image';
import { MarkdownBody } from '@/components/markdown';
import { RichHtml } from '@/components/rich-html';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/site/icons';
import { PageBody } from '@/components/site/page-body';
import { pageCopy } from '@/content/pages';
import { siteInfo } from '@/content/site';
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
  aboutLayout = false,
  address,
}: {
  title: string;
  page: PublicPage | null;
  lead?: string;
  /** The center's address, shown under the building photo of the about page. */
  address?: string;
  /** The "about" page: building photo and a branded heading above the text. */
  aboutLayout?: boolean;
}) {
  const heading = page?.title ?? title;
  return (
    <>
      <PageHeader title={heading} lead={lead} crumbs={[{ title: heading }]} />
      <PageBody>
        <div className="flex flex-col gap-[clamp(32px,5vw,56px)]">
          {aboutLayout ? (
            <figure className="m-0 flex flex-col gap-3">
              <Image
                src="/brand/bdc-building-angle.jpg"
                alt="سردر مرکز توسعه کسب‌وکار اتاق بازرگانی یزد"
                width={1672}
                height={941}
                sizes="(min-width: 1200px) 1136px, 100vw"
                priority
                className="block aspect-[21/9] min-h-[220px] w-full rounded-3xl bg-[#d9b98a] object-cover object-[60%_40%]"
              />
              <figcaption className="flex items-center gap-2 text-sm text-ink-2">
                <Icon name="pin" size={16} />
                {address}
              </figcaption>
            </figure>
          ) : null}
          <article className="mx-auto w-full max-w-[780px]">
            {aboutLayout ? (
              <div className="mb-7 flex items-center gap-4 border-b border-line pb-6">
                <Image
                  src="/brand/bdc-logo.png"
                  alt=""
                  width={64}
                  height={64}
                  className="size-16 flex-none"
                />
                <span className="flex flex-col gap-0.5 leading-normal">
                  <span className="font-display text-[22px] font-extrabold text-brand-900">
                    {siteInfo.name}
                  </span>
                  <span className="text-sm text-ink-2">{siteInfo.parentOrg}</span>
                </span>
              </div>
            ) : null}
            {page ? (
              <>
                <div className="text-justify text-[clamp(16px,1.6vw,18px)] [&_p]:leading-[2.25]">
                  {page.format === 'html' ? (
                    <RichHtml html={page.body} />
                  ) : (
                    <MarkdownBody source={page.body} />
                  )}
                </div>
                {page.updatedAt ? (
                  <p className="mt-10 text-xs text-ink-2">
                    آخرین به‌روزرسانی: {formatDate(page.updatedAt)}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="rounded-3xl border-[1.5px] border-dashed border-line-strong bg-surface-2 p-8 text-[15px] text-ink-2">
                {pageCopy.preparing}
              </p>
            )}
          </article>
        </div>
      </PageBody>
    </>
  );
}

/** Metadata for a built-in page; the description falls back to the body's start. */
export async function systemPageMetadata(slug: string): Promise<Metadata> {
  const definition = systemPage(slug)!;
  const page = await getSystemPageContent(slug);
  return {
    title: page?.title ?? definition.title,
    // An empty page must not output an empty description: fall back to the site's.
    description: (page && (page.seoDesc || plainExcerpt(page.text))) || undefined,
    alternates: { canonical: pagePath(slug) },
  };
}
