import { searchTerms } from '@/lib/search-text';
import { searchPublishedArticles } from '@/modules/content/service';
import { searchPublishedPages } from '@/modules/pages/service';
import { searchPublishedCourses } from '@/modules/training/service';

/**
 * Site search over published news/events, courses and pages. Each domain
 * searches its own tables (see `src/lib/search-text.ts` for the matching
 * rules); this module only combines the results.
 */
export async function searchSite(query: string) {
  const terms = searchTerms(query);
  if (terms.length === 0) return null;
  const [articles, courses, pages] = await Promise.all([
    searchPublishedArticles(terms),
    searchPublishedCourses(terms),
    searchPublishedPages(terms),
  ]);
  return { articles, courses, pages, total: articles.length + courses.length + pages.length };
}

export type SearchResults = NonNullable<Awaited<ReturnType<typeof searchSite>>>;
