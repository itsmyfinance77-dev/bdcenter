import { z } from 'zod';
import { linkSections, type LinkSection } from '@/content/pages';
import { prisma } from '@/lib/prisma';
import { requiredText, toLatinDigits } from '@/lib/validation';
import { recordAudit } from '@/modules/audit/service';

/**
 * Admin-editable link lists (the `ExternalLink` model): the Chamber-services
 * section on the home page and the footer's useful links. The initial
 * Chamber links were inserted by the `editable_pages_and_links` migration.
 */

export async function listLinks(section: LinkSection) {
  return prisma.externalLink.findMany({
    where: { section },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, title: true, url: true },
  });
}

/** Like `listLinks`, but an unreachable database yields an empty list, not an error page. */
export async function listLinksSafe(section: LinkSection) {
  try {
    return await listLinks(section);
  } catch (error) {
    console.error(`Could not load links for ${section}`, error);
    return [];
  }
}

/** http(s) addresses, or a path on this site ("/privacy"). */
export function isAllowedLinkUrl(url: string): boolean {
  if (url.startsWith('/')) return !url.startsWith('//') && !url.startsWith('/\\');
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const linkInputSchema = z.object({
  section: z.enum(Object.keys(linkSections) as [LinkSection, ...LinkSection[]]),
  title: requiredText('عنوان', 200),
  url: requiredText('نشانی', 500).refine(
    isAllowedLinkUrl,
    'نشانی باید با https:// یا http:// یا / شروع شود.',
  ),
  sortOrder: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const text = toLatinDigits(value).trim();
      return text === '' ? 0 : Number(text);
    },
    z.number({ invalid_type_error: 'ترتیب باید عدد باشد.' }).int().min(0).max(10000),
  ),
});

export type LinkInput = z.infer<typeof linkInputSchema>;

export async function listAllLinksForAdmin() {
  const rows = await prisma.externalLink.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return (Object.keys(linkSections) as LinkSection[]).map((section) => ({
    section,
    links: rows.filter((row) => row.section === section),
  }));
}

export async function saveLink(id: string | null, input: LinkInput, actorId: string) {
  const link = id
    ? await prisma.externalLink.update({ where: { id }, data: input })
    : await prisma.externalLink.create({ data: input });
  await recordAudit({
    actorId,
    action: id ? 'link.update' : 'link.create',
    entity: 'ExternalLink',
    entityId: link.id,
    metadata: { section: link.section, title: link.title, url: link.url },
  });
}

export async function deleteLink(id: string, actorId: string) {
  const link = await prisma.externalLink.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: 'link.delete',
    entity: 'ExternalLink',
    entityId: id,
    metadata: { section: link.section, title: link.title },
  });
}
