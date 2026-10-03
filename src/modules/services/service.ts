import { z } from 'zod';
import type { IconName } from '@/components/site/icons';
import { serviceTiles, tileHref } from '@/content/site';
import { prisma } from '@/lib/prisma';
import { richInput } from '@/lib/rich-html';
import { optionalText, requiredText } from '@/lib/validation';
import { recordAudit } from '@/modules/audit/service';

/**
 * The 7 «خدمات مرکز» tiles (owner's request, 2026-10-03: editable in the
 * panel). Slugs, icons, links and the home-page layout stay in code
 * (src/content/site.ts, src/components/service-tiles.tsx); staff edit the
 * title, the short line on the tile, whether a service is live or «به‌زودی»,
 * and the content of its /services/<slug> page. A missing `services` row means
 * the built-in values.
 */

/** Tiles with their own page or form: always live, their links never change. */
const FIXED = new Set(['training', 'consulting', 'service-desk']);

export type ServiceTileData = {
  slug: string;
  title: string;
  summary: string | null;
  /** Consulting's card text (built in). */
  description: string | null;
  cta: string | null;
  icon: IconName;
  href: string;
  isPlaceholder: boolean;
  /** Fixed tiles cannot be switched to «به‌زودی». */
  fixed: boolean;
  bodyHtml: string | null;
  updatedAt: Date | null;
};

type Row = Awaited<ReturnType<typeof prisma.service.findMany>>[number];

function merge(tile: (typeof serviceTiles)[number], row: Row | undefined): ServiceTileData {
  const fixed = FIXED.has(tile.slug);
  return {
    slug: tile.slug,
    title: row?.title || tile.title,
    summary: row ? row.summary : 'summary' in tile ? tile.summary : null,
    description: 'description' in tile ? tile.description : null,
    cta: 'cta' in tile ? tile.cta : null,
    icon: tile.icon as IconName,
    href: tileHref(tile),
    isPlaceholder: fixed ? false : (row?.isPlaceholder ?? tile.isPlaceholder),
    fixed,
    bodyHtml: row?.bodyHtml ?? null,
    updatedAt: row?.updatedAt ?? null,
  };
}

/** All tiles in their built-in order, with staff edits applied. */
export async function listServiceTiles(): Promise<ServiceTileData[]> {
  let rows: Row[] = [];
  try {
    rows = await prisma.service.findMany();
  } catch (error) {
    // The home page must still render if the database is unreachable.
    console.error('listServiceTiles: using the built-in tiles', error);
  }
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  return serviceTiles.map((tile) => merge(tile, bySlug.get(tile.slug)));
}

export async function getServiceTile(slug: string): Promise<ServiceTileData | null> {
  return (await listServiceTiles()).find((tile) => tile.slug === slug) ?? null;
}

export const serviceInputSchema = z.object({
  title: requiredText('عنوان', 120),
  summary: optionalText('توضیح کوتاه', 300),
  isPlaceholder: z.preprocess((value) => value === 'on', z.boolean()),
  // HTML from the rich editor.
  body: optionalText('متن صفحه', 500_000),
});

export async function saveServiceTile(
  slug: string,
  input: z.infer<typeof serviceInputSchema>,
  actorId: string,
): Promise<boolean> {
  const tile = serviceTiles.find((candidate) => candidate.slug === slug);
  if (!tile) return false;
  const body = richInput(input.body);
  const data = {
    title: input.title,
    summary: input.summary ?? null,
    isPlaceholder: FIXED.has(slug) ? false : input.isPlaceholder,
    bodyHtml: body.html,
    bodyText: body.text,
  };
  await prisma.service.upsert({
    where: { slug },
    create: { slug, ...data },
    update: data,
  });
  await recordAudit({
    actorId,
    action: 'service.update',
    entity: 'Service',
    entityId: slug,
    metadata: { title: input.title, isPlaceholder: data.isPlaceholder },
  });
  return true;
}
