import Link from 'next/link';
import { ArticleList } from '@/components/article-list';
import { ChamberLinks } from '@/components/chamber-links';
import { ServiceTiles } from '@/components/service-tiles';
import { aboutText, siteInfo } from '@/content/site';
import { listPublishedArticles, type ArticleSummary } from '@/modules/content/service';

export const dynamic = 'force-dynamic';

/** The landing page must render even if the database is briefly unreachable. */
async function latestArticles(): Promise<ArticleSummary[]> {
  try {
    return await listPublishedArticles({ limit: 5 });
  } catch (error) {
    console.error('Home page: could not load articles', error);
    return [];
  }
}

function organizationJsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${siteInfo.domain}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteInfo.name,
    url: siteUrl,
    telephone: siteInfo.contact.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: siteInfo.contact.address,
      addressLocality: 'یزد',
      addressCountry: 'IR',
    },
    parentOrganization: {
      '@type': 'Organization',
      name: siteInfo.parentOrg,
      url: 'https://yazdccima.com',
    },
  };
}

export default async function HomePage() {
  const articles = await latestArticles();

  return (
    <>
      <script
        type="application/ld+json"
        // Static, server-built object; `<` is escaped so the payload cannot close the tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd()).replace(/</g, '\\u003c'),
        }}
      />

      {/* 2- بنر بالای صفحه */}
      <section className="bg-brand-900 py-16 text-white">
        <div className="mx-auto max-w-(--container-page) px-4">
          <p className="text-sm text-on-dark">{siteInfo.parentOrg}</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold sm:text-4xl">{siteInfo.name}</h1>
        </div>
      </section>

      {/* 3- عکس نمای مرکز + هاور «درباره مرکز»، 4- اخبار و رویدادهای مرکز کنارش */}
      <section className="mx-auto grid max-w-(--container-page) gap-6 px-4 py-12 lg:grid-cols-2">
        <div
          tabIndex={0}
          role="group"
          aria-label="درباره مرکز"
          className="group relative aspect-video overflow-hidden rounded-panel bg-surface-2"
        >
          {/* TODO(OQ-BD-05): real photo of the center's building */}
          <div className="absolute inset-0 flex items-center justify-center text-ink-2">
            نمای مرکز
          </div>
          <div className="absolute inset-0 flex items-center overflow-y-auto bg-brand-900/90 p-6 text-sm leading-7 text-on-dark opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            {aboutText}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-bold text-brand-900">اخبار و رویدادهای مرکز</h2>
            <div className="flex gap-4 text-sm">
              <Link href="/news" className="text-primary hover:underline">
                همه اخبار
              </Link>
              <Link href="/events" className="text-primary hover:underline">
                همه رویدادها
              </Link>
            </div>
          </div>
          {articles.length === 0 ? (
            <p className="text-sm text-ink-2">به‌زودی از طریق داشبورد مدیریت محتوا منتشر می‌شود.</p>
          ) : (
            <ArticleList articles={articles} showKind />
          )}
        </div>
      </section>

      <ServiceTiles />
      <ChamberLinks />
    </>
  );
}
