import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3010';
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/account'] },
    sitemap: new URL('/sitemap.xml', base).toString(),
  };
}
