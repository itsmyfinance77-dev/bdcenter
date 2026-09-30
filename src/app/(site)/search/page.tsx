import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleList } from '@/components/article-list';
import { PageHeader } from '@/components/page-header';
import { SearchForm } from '@/components/search-form';
import { searchCopy } from '@/content/site';
import { formatDateTime, formatNumber } from '@/lib/format';
import { MAX_QUERY_LENGTH } from '@/lib/search-text';
import { plainExcerpt } from '@/lib/text';
import { searchSite } from '@/modules/search/service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: searchCopy.title,
  // Result pages are endless variations of the same content.
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const raw = (await searchParams).q;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, MAX_QUERY_LENGTH) ?? '';
  const results = query ? await searchSite(query) : null;

  return (
    <>
      <PageHeader title={searchCopy.title} crumbs={[{ title: searchCopy.title }]} />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
        <SearchForm defaultValue={query} large />

        {!query ? (
          <p className="text-sm text-ink-2">{searchCopy.hint}</p>
        ) : !results ? (
          <p className="text-sm text-ink-2">{searchCopy.tooShort}</p>
        ) : results.total === 0 ? (
          <p role="status" className="text-sm text-ink-2">
            {searchCopy.none(query)}
          </p>
        ) : (
          <>
            <p role="status" className="text-sm text-ink-2">
              {searchCopy.count(formatNumber(results.total), query)}
            </p>

            {results.courses.length > 0 ? (
              <section aria-labelledby="results-courses" className="space-y-3">
                <h2 id="results-courses" className="text-lg font-bold text-brand-900">
                  دوره‌ها
                </h2>
                <ul className="divide-y divide-line rounded-panel border border-line bg-white">
                  {results.courses.map((course) => (
                    <li key={course.slug}>
                      <Link
                        href={`/courses/${encodeURIComponent(course.slug)}`}
                        className="block px-5 py-4 hover:bg-surface-2"
                      >
                        <span className="font-semibold text-ink">{course.title}</span>
                        <span className="mt-1 block text-xs text-ink-2">
                          {[
                            course.instructor,
                            course.startsAt ? formatDateTime(course.startsAt) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {results.articles.length > 0 ? (
              <section aria-labelledby="results-articles" className="space-y-3">
                <h2 id="results-articles" className="text-lg font-bold text-brand-900">
                  اخبار و رویدادها
                </h2>
                <ArticleList articles={results.articles} showKind />
              </section>
            ) : null}

            {results.pages.length > 0 ? (
              <section aria-labelledby="results-pages" className="space-y-3">
                <h2 id="results-pages" className="text-lg font-bold text-brand-900">
                  صفحه‌ها
                </h2>
                <ul className="divide-y divide-line rounded-panel border border-line bg-white">
                  {results.pages.map((page) => (
                    <li key={page.path}>
                      <Link href={page.path} className="block px-5 py-4 hover:bg-surface-2">
                        <span className="font-semibold text-ink">{page.title}</span>
                        <span className="mt-1 line-clamp-2 block text-sm text-ink-2">
                          {plainExcerpt(page.body)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
