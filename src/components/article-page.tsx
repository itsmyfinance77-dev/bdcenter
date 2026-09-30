import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArticleList, articleBasePath, coverUrl } from '@/components/article-list';
import { MarkdownBody } from '@/components/markdown';
import { PageHeader } from '@/components/page-header';
import { formatDate, formatDateTime } from '@/lib/format';
import type { ArticleKind } from '@/lib/prisma';
import { getPublishedArticle, listPublishedArticles } from '@/modules/content/service';

const sectionTitle = { NEWS: 'اخبار', EVENT: 'رویدادها' } as const;

/** Shared list page for /news and /events. */
export async function ArticleIndexPage({ kind }: { kind: ArticleKind }) {
  const articles = await listPublishedArticles({ kind });
  return (
    <>
      <PageHeader title={sectionTitle[kind]} crumbs={[{ title: sectionTitle[kind] }]} />
      <div className="mx-auto max-w-3xl px-4 py-12">
        {articles.length === 0 ? (
          <p className="text-sm text-ink-2">هنوز موردی منتشر نشده است.</p>
        ) : (
          <ArticleList articles={articles} />
        )}
      </div>
    </>
  );
}

/**
 * Shared detail page for /news/[slug] and /events/[slug]. The body is stored
 * as Markdown and rendered by `MarkdownBody`, which never emits raw HTML.
 */
export async function ArticleDetailPage({ kind, slug }: { kind: ArticleKind; slug: string }) {
  const article = await getPublishedArticle(kind, slug);
  if (!article) notFound();

  return (
    <>
      <PageHeader
        title={article.title}
        lead={article.excerpt ?? undefined}
        crumbs={[
          { title: sectionTitle[kind], href: articleBasePath[kind] },
          { title: article.title },
        ]}
      />
      <article className="mx-auto max-w-3xl px-4 py-12">
        {article.coverImage ? (
          <div className="relative mb-8 aspect-video overflow-hidden rounded-panel bg-surface-2">
            <Image
              src={coverUrl(article.coverImage.id, 'lg')}
              alt={article.coverImage.altText ?? article.title}
              fill
              unoptimized
              priority
              sizes="(min-width: 48rem) 48rem, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}
        <dl className="mb-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
          {article.publishedAt ? (
            <div>
              <dt className="inline">تاریخ انتشار: </dt>
              <dd className="inline">{formatDate(article.publishedAt)}</dd>
            </div>
          ) : null}
          {article.eventStartsAt ? (
            <div>
              <dt className="inline">زمان برگزاری: </dt>
              <dd className="inline">{formatDateTime(article.eventStartsAt)}</dd>
            </div>
          ) : null}
          {article.eventLocation ? (
            <div>
              <dt className="inline">مکان: </dt>
              <dd className="inline">{article.eventLocation}</dd>
            </div>
          ) : null}
        </dl>
        <MarkdownBody source={article.bodyMarkdown} />
      </article>
    </>
  );
}

export async function articleMetadata(kind: ArticleKind, slug: string): Promise<Metadata> {
  const article = await getPublishedArticle(kind, slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt ?? undefined,
    alternates: { canonical: `${articleBasePath[kind]}/${article.slug}` },
    openGraph: {
      type: 'article',
      title: article.title,
      images: article.coverImage ? [coverUrl(article.coverImage.id, 'lg')] : undefined,
    },
  };
}
