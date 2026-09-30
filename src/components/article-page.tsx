import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleList, articleBasePath } from '@/components/article-list';
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
 * as Markdown; until a sanitizing renderer is added it is shown as plain
 * paragraphs, never as raw HTML.
 */
export async function ArticleDetailPage({ kind, slug }: { kind: ArticleKind; slug: string }) {
  const article = await getPublishedArticle(kind, slug);
  if (!article) notFound();

  const paragraphs = article.bodyMarkdown.split(/\n{2,}/).filter((p) => p.trim() !== '');
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
        <div className="space-y-4 text-base leading-8 text-ink">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>
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
    openGraph: { type: 'article', title: article.title },
  };
}
