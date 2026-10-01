import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@/lib/format';
import type { ArticleSummary } from '@/modules/content/service';

export const articleBasePath = { NEWS: '/news', EVENT: '/events' } as const;
const kindLabel = { NEWS: 'خبر', EVENT: 'رویداد' } as const;

/** Public URL of one size of a published article's cover (see src/app/media). */
export function coverUrl(assetId: string, variant: 'lg' | 'sm') {
  return `/media/${assetId}/${variant}`;
}

export function ArticleList({
  articles,
  showKind = false,
}: {
  articles: ArticleSummary[];
  showKind?: boolean;
}) {
  return (
    <ul className="divide-y divide-line rounded-panel border border-line bg-white">
      {articles.map((article) => {
        const date = article.kind === 'EVENT' ? article.eventStartsAt : article.publishedAt;
        return (
          <li key={article.id}>
            <Link
              href={`${articleBasePath[article.kind]}/${article.slug}`}
              className="flex gap-4 px-5 py-4 hover:bg-surface-2"
            >
              {article.coverImage ? (
                <div className="relative aspect-4/3 w-24 shrink-0 overflow-hidden rounded-card bg-surface-2 sm:w-32">
                  <Image
                    src={coverUrl(article.coverImage.id, 'sm')}
                    alt=""
                    fill
                    unoptimized
                    sizes="8rem"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
                  {showKind ? (
                    <span className="rounded-chip bg-surface-2 px-2 py-0.5">
                      {kindLabel[article.kind]}
                    </span>
                  ) : null}
                  {date ? <time dateTime={date.toISOString()}>{formatDate(date)}</time> : null}
                  {article.eventLocation ? <span>· {article.eventLocation}</span> : null}
                </div>
                <h3 className="mt-1 font-semibold text-ink">{article.title}</h3>
                {article.excerpt ? (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-2">{article.excerpt}</p>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const cardBadge = {
  NEWS: 'bg-primary-tint text-primary',
  EVENT: 'bg-accent-tint text-accent-ink',
} as const;

/** Grid card for a news item or event (BDC Yazd design). */
export function ArticleCard({ article }: { article: ArticleSummary }) {
  const date = article.kind === 'EVENT' ? article.eventStartsAt : article.publishedAt;
  return (
    <Link
      href={`${articleBasePath[article.kind]}/${encodeURIComponent(article.slug)}`}
      className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-white text-ink transition-[transform,box-shadow,border-color] duration-350 ease-(--ease-out-soft) hover:-translate-y-1.5 hover:border-[#c9d6ee] hover:text-ink hover:shadow-[0_24px_48px_-24px_rgba(11,34,87,.35)]"
    >
      <div className="bg-placeholder-stripes relative aspect-[16/10]">
        {article.coverImage ? (
          <Image
            src={coverUrl(article.coverImage.id, 'sm')}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1200px) 380px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : null}
        <span
          className={`absolute top-3.5 right-3.5 rounded-full px-3 py-[5px] text-[13px] font-bold ${cardBadge[article.kind]}`}
        >
          {kindLabel[article.kind]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-5 pt-5 pb-[22px]">
        {date ? (
          <span className="flex items-center gap-2 text-[13.5px] text-ink-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM4 10h16M8 3v4M16 3v4" />
            </svg>
            <time dateTime={date.toISOString()}>{formatDate(date)}</time>
          </span>
        ) : null}
        <h2 className="text-[17px] leading-[1.8] font-bold text-pretty text-ink">
          {article.title}
        </h2>
        {article.excerpt ? (
          <p className="line-clamp-2 text-sm leading-7 text-ink-2">{article.excerpt}</p>
        ) : null}
      </div>
    </Link>
  );
}
