import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddToCalendar } from '@/components/add-to-calendar';
import { ArticleCard, articleBasePath, coverUrl } from '@/components/article-list';
import { RichBody } from '@/components/rich-body';
import { PageHeader } from '@/components/page-header';
import { Icon, type IconName } from '@/components/site/icons';
import { PageBody } from '@/components/site/page-body';
import { calendarCopy } from '@/content/site';
import { formatDate, formatDateTime } from '@/lib/format';
import type { ArticleKind } from '@/lib/prisma';
import { getPublishedArticle, listPublishedArticles } from '@/modules/content/service';

const sectionTitle = { NEWS: 'اخبار', EVENT: 'رویدادها', ALL: 'اخبار و رویدادها' } as const;
const kindLabel = { NEWS: 'خبر', EVENT: 'رویداد' } as const;
const badge = {
  NEWS: 'bg-primary-tint text-primary',
  EVENT: 'bg-accent-tint text-accent-ink',
} as const;

/** The all / news / events switch above the list; plain links so it works without JS. */
const tabs = [
  { key: 'ALL', label: 'همه', href: '/news?view=all' },
  { key: 'NEWS', label: 'اخبار', href: '/news' },
  { key: 'EVENT', label: 'رویدادها', href: '/events' },
] as const;

/** Shared list page for /news, /events and /news?view=all. */
export async function ArticleIndexPage({ kind }: { kind: ArticleKind | 'ALL' }) {
  const articles = await listPublishedArticles({ kind: kind === 'ALL' ? undefined : kind });
  return (
    <>
      <PageHeader title={sectionTitle[kind]} crumbs={[{ title: sectionTitle[kind] }]} />
      <PageBody>
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="نوع مطلب" className="flex gap-1 rounded-[14px] bg-surface-2 p-1">
            {tabs.map((tab) => {
              const current = tab.key === kind;
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  aria-current={current ? 'page' : undefined}
                  className={`inline-flex min-h-11 items-center rounded-[10px] px-[18px] text-[14.5px] font-bold transition-[background-color,color,box-shadow] duration-200 ${
                    current
                      ? 'bg-white text-brand-900 shadow-[0_4px_12px_-6px_rgba(11,34,87,.35)] hover:text-brand-900'
                      : 'text-ink-2 hover:text-brand-900'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          {kind !== 'NEWS' ? (
            <Link
              href="/events/calendar"
              className="inline-flex min-h-11 items-center gap-2 text-[14.5px] font-bold text-primary"
            >
              <Icon name="calendar" size={18} />
              {calendarCopy.title}
            </Link>
          ) : null}
        </div>
        {articles.length === 0 ? (
          <p className="rounded-3xl border-[1.5px] border-dashed border-line-strong bg-surface-2 p-8 text-center text-[15px] text-ink-2">
            هنوز موردی منتشر نشده است.
          </p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
            {articles.map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}

function MetaChip({
  icon,
  tone,
  label,
  children,
}: {
  icon: IconName;
  tone: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border border-line bg-white px-4 py-2.5 text-[14.5px]">
      <span className={`grid ${tone}`}>
        <Icon name={icon} size={18} />
      </span>
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-bold text-ink">{children}</dd>
    </div>
  );
}

/**
 * Shared detail page for /news/[slug] and /events/[slug]. The body comes from
 * the rich editor (sanitized HTML, ADR-0005); older articles render Markdown.
 */
export async function ArticleDetailPage({ kind, slug }: { kind: ArticleKind; slug: string }) {
  const article = await getPublishedArticle(kind, slug);
  if (!article) notFound();
  const related = (await listPublishedArticles({ kind, limit: 4 }))
    .filter((other) => other.id !== article.id)
    .slice(0, 3);
  const upcomingEvent =
    kind === 'EVENT' && article.eventStartsAt && article.eventStartsAt > new Date();

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
      <PageBody>
        <div className="flex flex-col gap-12">
          <article className="mx-auto flex w-full max-w-[780px] flex-col gap-7">
            <div className="bg-placeholder-stripes relative aspect-video overflow-hidden rounded-3xl">
              {article.coverImage ? (
                <Image
                  src={coverUrl(article.coverImage.id, 'lg')}
                  alt={article.coverImage.altText ?? article.title}
                  fill
                  unoptimized
                  priority
                  sizes="(min-width: 840px) 780px, 100vw"
                  className="object-cover"
                />
              ) : null}
              <span
                className={`absolute top-4 right-4 rounded-full px-3 py-[5px] text-[13px] font-bold ${badge[kind]}`}
              >
                {kindLabel[kind]}
              </span>
            </div>
            <dl className="flex flex-wrap gap-3">
              {article.publishedAt ? (
                <MetaChip icon="calendar" tone="text-primary" label="تاریخ انتشار:">
                  <time dateTime={article.publishedAt.toISOString()}>
                    {formatDate(article.publishedAt)}
                  </time>
                </MetaChip>
              ) : null}
              {article.eventStartsAt ? (
                <MetaChip icon="clock" tone="text-accent-ink" label="زمان برگزاری:">
                  <time dateTime={article.eventStartsAt.toISOString()}>
                    {formatDateTime(article.eventStartsAt)}
                  </time>
                </MetaChip>
              ) : null}
              {article.eventLocation ? (
                <MetaChip icon="pin" tone="text-accent-ink" label="مکان:">
                  {article.eventLocation}
                </MetaChip>
              ) : null}
            </dl>
            {upcomingEvent ? (
              <AddToCalendar
                href={`/events/${encodeURIComponent(article.slug)}/ics`}
                event={{
                  title: article.title,
                  startsAt: article.eventStartsAt!,
                  endsAt: article.eventEndsAt,
                  location: article.eventLocation,
                  description: article.excerpt,
                }}
              />
            ) : null}
            <div className="text-justify text-[clamp(16px,1.6vw,18px)] [&_p]:leading-[2.2]">
              <RichBody html={article.bodyHtml} markdown={article.bodyMarkdown} />
            </div>
            <Link
              href={articleBasePath[kind]}
              className="inline-flex min-h-11 items-center gap-2 self-start text-[14.5px] font-bold text-primary"
            >
              <Icon name="arrowEnd" size={16} strokeWidth={2} />
              {kind === 'EVENT' ? 'همه رویدادها' : 'همه اخبار'}
            </Link>
          </article>
          {related.length > 0 ? (
            <section
              aria-labelledby="related-title"
              className="flex flex-col gap-5 border-t border-line pt-10"
            >
              <h2 id="related-title" className="text-[22px] font-extrabold text-brand-900">
                مطالب مرتبط
              </h2>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
                {related.map((other) => (
                  <li key={other.id}>
                    <ArticleCard article={other} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </PageBody>
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
