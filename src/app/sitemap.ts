import type { MetadataRoute } from 'next';
import { articleBasePath } from '@/components/article-list';
import { serviceTiles } from '@/content/site';
import { listPublishedArticleUrls } from '@/modules/content/service';
import { listPublishedForms } from '@/modules/forms/service';
import { listPublishedCustomPageUrls, listPublishedSystemPages } from '@/modules/pages/service';
import { listPublishedCourseUrls } from '@/modules/training/service';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const url = (path: string) => new URL(path, base).toString();

  const staticPaths = ['/', '/about', '/contact', '/news', '/events', '/forms', '/courses'];
  const servicePaths = serviceTiles
    .filter((tile) => !('href' in tile))
    .map((tile) => `/services/${tile.slug}`);

  const [articles, forms, courses, customPages, systemPages] = await Promise.all([
    listPublishedArticleUrls(),
    listPublishedForms(),
    listPublishedCourseUrls(),
    listPublishedCustomPageUrls(),
    listPublishedSystemPages(),
  ]);
  const legalPaths = systemPages.map((page) => page.path).filter((path) => path !== '/about');

  return [
    ...[...staticPaths, ...servicePaths, ...legalPaths].map((path) => ({ url: url(path) })),
    ...customPages.map((page) => ({
      url: url(`/pages/${page.slug}`),
      lastModified: page.updatedAt,
    })),
    ...forms.map((form) => ({ url: url(`/forms/${form.slug}`) })),
    ...courses.map((course) => ({
      url: url(`/courses/${course.slug}`),
      lastModified: course.updatedAt,
    })),
    ...articles.map((article) => ({
      url: url(`${articleBasePath[article.kind]}/${article.slug}`),
      lastModified: article.updatedAt,
    })),
  ];
}
