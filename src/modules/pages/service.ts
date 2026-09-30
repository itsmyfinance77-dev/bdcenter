import { z } from 'zod';
import { systemPages, type SystemPage } from '@/content/pages';
import { prisma } from '@/lib/prisma';
import { allTermsIn, matchesAllTerms, SqlParams } from '@/lib/search-text';
import { SLUG_ERROR, SLUG_TAKEN, slugify, slugPattern } from '@/lib/slug';
import { optionalText, requiredText } from '@/lib/validation';
import { recordAudit } from '@/modules/audit/service';

/**
 * Admin-editable institutional pages (the `Page` model). Built-in pages
 * (about, privacy, terms) live at fixed addresses; admins can also add their
 * own pages, served at `/pages/<slug>`. Bodies are Markdown, stored as one
 * typed section so richer section types can be added later without a
 * migration; nothing is ever rendered as raw HTML.
 */

const sectionsSchema = z.array(z.object({ type: z.literal('markdown'), body: z.string() }));

function bodyOf(sections: unknown): string {
  const parsed = sectionsSchema.safeParse(sections);
  return parsed.success ? parsed.data.map((section) => section.body).join('\n\n') : '';
}

export function systemPage(slug: string): SystemPage | undefined {
  return systemPages.find((page) => page.slug === slug);
}

/** Public address of a page. */
export function pagePath(slug: string): string {
  return systemPage(slug)?.path ?? `/pages/${slug}`;
}

export type PublicPage = {
  title: string;
  body: string;
  seoDesc: string | null;
  updatedAt: Date | null;
};

/** A published page, or null. */
export async function getPublishedPage(slug: string): Promise<PublicPage | null> {
  const page = await prisma.page.findFirst({ where: { slug, status: 'PUBLISHED' } });
  if (!page) return null;
  return {
    title: page.title,
    body: bodyOf(page.sections),
    seoDesc: page.seoDesc,
    updatedAt: page.updatedAt,
  };
}

/**
 * What a built-in page shows: the published version, else its approved
 * fallback copy, else null (the page says it is being prepared).
 */
export async function getSystemPageContent(slug: string): Promise<PublicPage | null> {
  const definition = systemPage(slug);
  if (!definition) return null;
  const published = await getPublishedPage(slug);
  if (published) return published;
  return definition.fallback === null
    ? null
    : { title: definition.title, body: definition.fallback, seoDesc: null, updatedAt: null };
}

/** The section bodies as one text, so JSON keys never match a search. */
const sectionsText =
  "(SELECT string_agg(section->>'body', ' ') FROM jsonb_array_elements(sections) AS section)";

/** Published pages matching every search term, with their public addresses. */
export async function searchPublishedPages(terms: string[], limit = 10) {
  if (terms.length === 0) return [];
  const params = new SqlParams();
  const where = matchesAllTerms(['title', sectionsText], terms, params);
  const rows = await prisma.$queryRawUnsafe<{ slug: string; title: string; sections: unknown }[]>(
    `SELECT slug, title, sections FROM pages
     WHERE status = 'PUBLISHED' AND ${where}
     ORDER BY ${allTermsIn('title', terms, params)} DESC, "updatedAt" DESC
     LIMIT ${params.add(limit)}`,
    ...params.values,
  );
  return rows.map((row) => ({
    title: row.title,
    path: pagePath(row.slug),
    body: bodyOf(row.sections),
  }));
}

/** Published custom pages (not the built-in ones), for the sitemap. */
export async function listPublishedCustomPageUrls() {
  return prisma.page.findMany({
    where: { status: 'PUBLISHED', slug: { notIn: systemPages.map((page) => page.slug) } },
    select: { slug: true, updatedAt: true },
  });
}

/** Which built-in legal pages are published, for footer links. */
export async function listPublishedSystemPages() {
  const rows = await prisma.page.findMany({
    where: { status: 'PUBLISHED', slug: { in: systemPages.map((page) => page.slug) } },
    select: { slug: true, title: true },
  });
  return rows.map((row) => ({ ...row, path: pagePath(row.slug) }));
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type AdminPageRow = {
  slug: string;
  title: string;
  path: string;
  isSystem: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | null; // null: never saved
  updatedAt: Date | null;
};

export async function listPagesForAdmin(): Promise<AdminPageRow[]> {
  const rows = await prisma.page.findMany({ orderBy: { createdAt: 'asc' } });
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const builtIn = systemPages.map((definition) => {
    const row = bySlug.get(definition.slug);
    return {
      slug: definition.slug,
      title: row?.title ?? definition.title,
      path: definition.path,
      isSystem: true,
      status: row?.status ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  });
  const custom = rows
    .filter((row) => !systemPage(row.slug))
    .map((row) => ({
      slug: row.slug,
      title: row.title,
      path: pagePath(row.slug),
      isSystem: false,
      status: row.status,
      updatedAt: row.updatedAt,
    }));
  return [...builtIn, ...custom];
}

export type AdminPage = {
  slug: string;
  isSystem: boolean;
  exists: boolean;
  title: string;
  body: string;
  seoDesc: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  updatedAt: Date | null;
};

/** A page for the editor; an unsaved built-in page starts from its draft text. */
export async function getPageForAdmin(slug: string): Promise<AdminPage | null> {
  const row = await prisma.page.findUnique({ where: { slug } });
  const definition = systemPage(slug);
  if (row) {
    return {
      slug,
      isSystem: Boolean(definition),
      exists: true,
      title: row.title,
      body: bodyOf(row.sections),
      seoDesc: row.seoDesc ?? '',
      status: row.status,
      updatedAt: row.updatedAt,
    };
  }
  if (!definition) return null;
  return {
    slug,
    isSystem: true,
    exists: false,
    title: definition.title,
    body: definition.draft,
    seoDesc: '',
    status: 'DRAFT',
    updatedAt: null,
  };
}

export const pageInputSchema = z.object({
  title: requiredText('عنوان', 200),
  slug: optionalText('نامک', 120),
  body: requiredText('متن', 50000),
  seoDesc: optionalText('توضیح برای موتورهای جستجو', 300),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
});

export type PageInput = z.infer<typeof pageInputSchema>;

/**
 * Saves a page. `slug` is the page being edited (null for a new custom
 * page); built-in pages keep their slug, custom pages may rename theirs.
 */
export async function savePage(
  slug: string | null,
  input: PageInput,
  actorId: string,
): Promise<{ ok: true; slug: string } | { ok: false; errors: Record<string, string> }> {
  const isSystem = slug !== null && Boolean(systemPage(slug));
  const targetSlug = isSystem ? slug! : slugify(input.slug ?? input.title);
  if (!isSystem) {
    if (!slugPattern.test(targetSlug)) return { ok: false, errors: { slug: SLUG_ERROR } };
    if (systemPage(targetSlug)) return { ok: false, errors: { slug: SLUG_TAKEN } };
    if (targetSlug !== slug) {
      const clash = await prisma.page.findUnique({ where: { slug: targetSlug } });
      if (clash) return { ok: false, errors: { slug: SLUG_TAKEN } };
    }
  }

  const existing = slug ? await prisma.page.findUnique({ where: { slug } }) : null;
  if (slug && !existing && !isSystem) return { ok: false, errors: { _form: 'این صفحه پیدا نشد.' } };

  const data = {
    slug: targetSlug,
    title: input.title,
    sections: [{ type: 'markdown' as const, body: input.body }],
    seoDesc: input.seoDesc ?? null,
    status: input.status,
    publishedAt: existing?.publishedAt ?? (input.status === 'PUBLISHED' ? new Date() : null),
  };
  const page = existing
    ? await prisma.page.update({ where: { id: existing.id }, data })
    : await prisma.page.create({ data });

  await recordAudit({
    actorId,
    action: existing ? 'page.update' : 'page.create',
    entity: 'Page',
    entityId: page.id,
    metadata: { slug: page.slug, status: page.status },
  });
  return { ok: true, slug: page.slug };
}

/** Deletes a custom page. Built-in pages can only be unpublished. */
export async function deletePage(slug: string, actorId: string): Promise<boolean> {
  if (systemPage(slug)) return false;
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page) return false;
  await prisma.page.delete({ where: { id: page.id } });
  await recordAudit({
    actorId,
    action: 'page.delete',
    entity: 'Page',
    entityId: page.id,
    metadata: { slug },
  });
  return true;
}
