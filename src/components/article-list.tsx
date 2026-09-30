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
