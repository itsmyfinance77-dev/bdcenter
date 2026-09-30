import { z } from 'zod';
import { parseJalaliDateTime } from '@/lib/jalali';
import { prisma, type ArticleKind } from '@/lib/prisma';
import { optionalText, requiredText } from '@/lib/validation';
import { recordAudit } from '@/modules/audit/service';

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
  return prisma.article.findUnique({ where: { id } });
}

/** Unicode letters/digits separated by single hyphens; Persian slugs are allowed. */
const slugPattern = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

/** Persian half-space (نیم‌فاصله); becomes a hyphen in slugs. */
const ZERO_WIDTH_NON_JOINER = String.fromCharCode(0x200c);

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replaceAll(ZERO_WIDTH_NON_JOINER, '-')
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

const jalaliDateTime = (label: string) =>
  optionalText(label, 30).transform((value, ctx) => {
    if (value === undefined) return null;
    const date = parseJalaliDateTime(value);
    if (!date) {
      ctx.addIssue({ code: 'custom', message: `${label} را به شکل ۱۴۰۵/۰۷/۱۵ ۱۸:۳۰ وارد کنید.` });
      return z.NEVER;
    }
    return date;
  });

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
        message: 'نامک فقط می‌تواند حروف، عدد و خط تیره داشته باشد.',
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

/** Creates (no id) or updates an article. `publishedAt` is stamped on first publish. */
export async function saveArticle(
  id: string | null,
  input: ArticleInput,
  actorId: string,
): Promise<SaveResult> {
  const clash = await prisma.article.findFirst({
    where: { slug: input.slug, NOT: id ? { id } : undefined },
    select: { id: true },
  });
  if (clash) return { ok: false, errors: { slug: 'این نامک قبلاً استفاده شده است.' } };

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
    ? await prisma.article.findUnique({ where: { id }, select: { publishedAt: true } })
    : null;
  if (id && !existing) return { ok: false, errors: { _form: 'این مطلب پیدا نشد.' } };
  const publishedAt = existing?.publishedAt ?? (input.status === 'PUBLISHED' ? new Date() : null);

  const article = id
    ? await prisma.article.update({ where: { id }, data: { ...data, publishedAt } })
    : await prisma.article.create({ data: { ...data, publishedAt } });

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
  const article = await prisma.article.delete({ where: { id }, select: { title: true } });
  await recordAudit({
    actorId,
    action: 'content.delete',
    entity: 'Article',
    entityId: id,
    metadata: { title: article.title },
  });
}

export async function countArticlesByStatus() {
  const rows = await prisma.article.groupBy({ by: ['status'], _count: true });
  return Object.fromEntries(rows.map((row) => [row.status, row._count])) as Partial<
    Record<'DRAFT' | 'PUBLISHED' | 'ARCHIVED', number>
  >;
}
