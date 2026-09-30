import { prisma, type ArticleKind } from '@/lib/prisma';

const articleSummarySelect = {
  id: true,
  kind: true,
  slug: true,
  title: true,
  excerpt: true,
  publishedAt: true,
  eventStartsAt: true,
  eventLocation: true,
} as const;

/** Published news/events, newest first. Omit `kind` to mix both (home page). */
export async function listPublishedArticles(options: { kind?: ArticleKind; limit?: number } = {}) {
  return prisma.article.findMany({
    where: { status: 'PUBLISHED', kind: options.kind },
    orderBy: { publishedAt: 'desc' },
    take: options.limit,
    select: articleSummarySelect,
  });
}

export type ArticleSummary = Awaited<ReturnType<typeof listPublishedArticles>>[number];

export async function getPublishedArticle(kind: ArticleKind, slug: string) {
  return prisma.article.findFirst({ where: { kind, slug, status: 'PUBLISHED' } });
}

/** Slugs and last-modified times for the sitemap. */
export async function listPublishedArticleUrls() {
  return prisma.article.findMany({
    where: { status: 'PUBLISHED' },
    select: { kind: true, slug: true, updatedAt: true },
  });
}
