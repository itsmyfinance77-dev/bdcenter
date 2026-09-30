import type { MetadataRoute } from 'next';
import { articleBasePath } from '@/components/article-list';
import { serviceTiles } from '@/content/site';
import { listPublishedArticleUrls } from '@/modules/content/service';
import { listPublishedForms } from '@/modules/forms/service';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const url = (path: string) => new URL(path, base).toString();

  const staticPaths = ['/', '/about', '/contact', '/news', '/events', '/forms'];
  const servicePaths = serviceTiles
    .filter((tile) => !('externalUrl' in tile) && !('href' in tile))
    .map((tile) => `/services/${tile.slug}`);

  const [articles, forms] = await Promise.all([listPublishedArticleUrls(), listPublishedForms()]);

  return [
    ...[...staticPaths, ...servicePaths].map((path) => ({ url: url(path) })),
    ...forms.map((form) => ({ url: url(`/forms/${form.slug}`) })),
    ...articles.map((article) => ({
      url: url(`${articleBasePath[article.kind]}/${article.slug}`),
      lastModified: article.updatedAt,
    })),
  ];
}
