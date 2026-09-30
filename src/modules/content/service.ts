import { z } from 'zod';
import { jalaliDateTime } from '@/lib/jalali';
import { prisma, type ArticleKind } from '@/lib/prisma';
import { allTermsIn, matchesAllTerms, SqlParams } from '@/lib/search-text';
import { SLUG_ERROR, SLUG_TAKEN, slugify, slugPattern } from '@/lib/slug';
import { optionalText, requiredText } from '@/lib/validation';
import { recordAudit } from '@/modules/audit/service';
import { checkImageUpload, deleteStoredImage, storeImage } from '@/modules/files/service';

const coverSelect = { select: { id: true, altText: true } } as const;

const articleSummarySelect = {
  id: true,
  kind: true,
  slug: true,
  title: true,
  excerpt: true,
  publishedAt: true,
  eventStartsAt: true,
  eventLocation: true,
  coverImage: coverSelect,
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
  return prisma.article.findFirst({
    where: { kind, slug, status: 'PUBLISHED' },
    include: { coverImage: coverSelect },
  });
}

/** Published news/events matching every search term; title hits first, then newest. */
export async function searchPublishedArticles(terms: string[], limit = 20) {
  if (terms.length === 0) return [];
  const params = new SqlParams();
  const where = matchesAllTerms(
    ['title', 'excerpt', '"bodyMarkdown"', '"eventLocation"'],
    terms,
    params,
  );
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM articles
     WHERE status = 'PUBLISHED' AND ${where}
     ORDER BY ${allTermsIn('title', terms, params)} DESC, "publishedAt" DESC NULLS LAST
     LIMIT ${params.add(limit)}`,
    ...params.values,
  );
  const items = await prisma.article.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
    select: articleSummarySelect,
  });
  return rows.flatMap((row) => items.find((item) => item.id === row.id) ?? []);
}

/** Slugs and last-modified times for the sitemap. */
export async function listPublishedArticleUrls() {
  return prisma.article.findMany({
    where: { status: 'PUBLISHED' },
    select: { kind: true, slug: true, updatedAt: true },
  });
}

// ---------------------------------------------------------------------------
// Admin: news & events
// ---------------------------------------------------------------------------

export const ADMIN_PAGE_SIZE = 20;

export async function listArticlesForAdmin(page: number) {
  const [items, total] = await Promise.all([
    prisma.article.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        kind: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
      },
    }),
    prisma.article.count(),
  ]);
  return { items, pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

export async function getArticleForAdmin(id: string) {
  return prisma.article.findUnique({ where: { id }, include: { coverImage: coverSelect } });
}

export const articleInputSchema = z
  .object({
    kind: z.enum(['NEWS', 'EVENT']),
    title: requiredText('عنوان', 200),
    slug: optionalText('نامک', 120),
    excerpt: optionalText('خلاصه', 500),
    bodyMarkdown: requiredText('متن', 50000),
    eventStartsAt: jalaliDateTime('زمان شروع'),
    eventEndsAt: jalaliDateTime('زمان پایان'),
    eventLocation: optionalText('مکان', 200),
    coverAlt: optionalText('توضیح عکس', 200),
    removeCover: z.preprocess((value) => value === 'on', z.boolean()),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  })
  .transform((value) => ({
    ...value,
    slug: value.slug ? slugify(value.slug) : slugify(value.title),
  }))
  .superRefine((value, ctx) => {
    if (!slugPattern.test(value.slug)) {
      ctx.addIssue({
        code: 'custom',
        path: ['slug'],
        message: SLUG_ERROR,
      });
    }
    if (value.eventStartsAt && value.eventEndsAt && value.eventEndsAt < value.eventStartsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['eventEndsAt'],
        message: 'زمان پایان باید بعد از زمان شروع باشد.',
      });
    }
  });

export type ArticleInput = z.infer<typeof articleInputSchema>;

export type SaveResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };

/**
 * Creates (no id) or updates an article. `publishedAt` is stamped on first
 * publish. `coverFile` (an empty file input counts as none) replaces the
 * current cover; `input.removeCover` drops it.
 */
export async function saveArticle(
  id: string | null,
  input: ArticleInput,
  coverFile: File | null,
  actorId: string,
): Promise<SaveResult> {
  const newCover = coverFile && coverFile.size > 0 ? coverFile : null;
  if (newCover) {
    const problem = checkImageUpload(newCover);
    if (problem) return { ok: false, errors: { coverImage: problem } };
  }

  const clash = await prisma.article.findFirst({
    where: { slug: input.slug, NOT: id ? { id } : undefined },
    select: { id: true },
  });
  if (clash) return { ok: false, errors: { slug: SLUG_TAKEN } };

  const event =
    input.kind === 'EVENT'
      ? {
          eventStartsAt: input.eventStartsAt,
          eventEndsAt: input.eventEndsAt,
          eventLocation: input.eventLocation ?? null,
        }
      : { eventStartsAt: null, eventEndsAt: null, eventLocation: null };
  const data = {
    kind: input.kind,
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt ?? null,
    bodyMarkdown: input.bodyMarkdown,
    status: input.status,
    ...event,
  };

  const existing = id
    ? await prisma.article.findUnique({
        where: { id },
        select: { publishedAt: true, coverImageId: true },
      })
    : null;
  if (id && !existing) return { ok: false, errors: { _form: 'این مطلب پیدا نشد.' } };
  const publishedAt = existing?.publishedAt ?? (input.status === 'PUBLISHED' ? new Date() : null);

  const oldCoverId = existing?.coverImageId ?? null;
  let coverImageId = input.removeCover ? null : oldCoverId;
  if (newCover) {
    const stored = await storeImage('covers', newCover);
    if (!stored) return { ok: false, errors: { coverImage: 'فایل تصویر معتبر نیست.' } };
    const asset = await prisma.mediaAsset.create({
      data: { ...stored, altText: input.coverAlt ?? null },
    });
    coverImageId = asset.id;
  } else if (coverImageId) {
    await prisma.mediaAsset.update({
      where: { id: coverImageId },
      data: { altText: input.coverAlt ?? null },
    });
  }

  const article = id
    ? await prisma.article.update({ where: { id }, data: { ...data, publishedAt, coverImageId } })
    : await prisma.article.create({ data: { ...data, publishedAt, coverImageId } });
  if (oldCoverId && oldCoverId !== coverImageId) await deleteMediaIfUnused(oldCoverId);

  await recordAudit({
    actorId,
    action: id ? 'content.update' : 'content.create',
    entity: 'Article',
    entityId: article.id,
    metadata: { title: article.title, status: article.status },
  });
  return { ok: true, id: article.id };
}

export async function deleteArticle(id: string, actorId: string) {
  const article = await prisma.article.delete({
    where: { id },
    select: { title: true, coverImageId: true },
  });
  if (article.coverImageId) await deleteMediaIfUnused(article.coverImageId);
  await recordAudit({
    actorId,
    action: 'content.delete',
    entity: 'Article',
    entityId: id,
    metadata: { title: article.title },
  });
}

/** Deletes a media asset and its files once no article points at it any more. */
async function deleteMediaIfUnused(assetId: string) {
  const inUse = await prisma.article.count({ where: { coverImageId: assetId } });
  if (inUse > 0) return;
  const asset = await prisma.mediaAsset.delete({
    where: { id: assetId },
    select: { storageKey: true },
  });
  await deleteStoredImage(asset.storageKey);
}

/**
 * Storage key of a cover image the public may see: one used by a published
 * article. Drafts' covers are only served through the admin route.
 */
export async function getPublicCoverKey(assetId: string): Promise<string | null> {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: assetId, articles: { some: { status: 'PUBLISHED' } } },
    select: { storageKey: true },
  });
  return asset?.storageKey ?? null;
}

export async function getCoverKeyForAdmin(assetId: string): Promise<string | null> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    select: { storageKey: true },
  });
  return asset?.storageKey ?? null;
}

export async function countArticlesByStatus() {
  const rows = await prisma.article.groupBy({ by: ['status'], _count: true });
  return Object.fromEntries(rows.map((row) => [row.status, row._count])) as Partial<
    Record<'DRAFT' | 'PUBLISHED' | 'ARCHIVED', number>
  >;
}
