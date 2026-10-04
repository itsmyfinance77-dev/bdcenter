import Image from 'next/image';
import Link from 'next/link';
import { coverUrl, articleBasePath } from '@/components/article-list';
import { ChamberLinks } from '@/components/chamber-links';
import { AboutReveal } from '@/components/home/about-reveal';
import { Ecosystem, HeroBackground } from '@/components/home/hero-visuals';
import { LogoIntro } from '@/components/home/intro';
import { NewsCarousel, type NewsCard } from '@/components/home/news-carousel';
import { ServiceTiles } from '@/components/service-tiles';
import { Icon } from '@/components/site/icons';
import { aboutText, homeCopy, siteInfo } from '@/content/site';
import { formatDate } from '@/lib/format';
import { plainText } from '@/lib/text';
import { listPublishedArticles, type ArticleSummary } from '@/modules/content/service';
import { getSystemPageContent } from '@/modules/pages/service';
import {
  getContactInfo,
  getHomeStats,
  getHomeTexts,
  type ContactInfo,
} from '@/modules/settings/service';
import { AtAGlance } from '@/components/home/at-a-glance';

export const dynamic = 'force-dynamic';

/** The landing page must render even if the database is briefly unreachable. */
async function latestArticles(): Promise<ArticleSummary[]> {
  try {
    return await listPublishedArticles({ limit: 8 });
  } catch (error) {
    console.error('Home page: could not load articles', error);
    return [];
  }
}

/** The admin-edited "about" text, or the approved copy if the database is unreachable. */
async function aboutSummary(): Promise<string> {
  try {
    const page = await getSystemPageContent('about');
    return page ? plainText(page.text) : aboutText;
  } catch (error) {
    console.error('Home page: could not load the about page', error);
    return aboutText;
  }
}

function organizationJsonLd(contact: ContactInfo) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${siteInfo.domain}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteInfo.name,
    url: siteUrl,
    logo: new URL('/brand/bdc-logo.png', siteUrl).toString(),
    telephone: contact.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: contact.address,
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

function toCard(article: ArticleSummary): NewsCard {
  const date = article.kind === 'EVENT' ? article.eventStartsAt : article.publishedAt;
  return {
    id: article.id,
    kind: article.kind,
    href: `${articleBasePath[article.kind]}/${encodeURIComponent(article.slug)}`,
    title: article.title,
    date: date ? formatDate(date) : null,
    dateTime: date ? date.toISOString() : null,
    coverUrl: article.coverImage ? coverUrl(article.coverImage.id, 'sm') : null,
  };
}

const sectionTitle = 'text-[clamp(28px,3.4vw,40px)] leading-[1.35] font-extrabold text-brand-900';

export default async function HomePage() {
  const [articles, about, contact, stats, texts] = await Promise.all([
    latestArticles(),
    aboutSummary(),
    getContactInfo(),
    getHomeStats(),
    getHomeTexts(),
  ]);

  return (
    <>
      <LogoIntro />
      <script
        type="application/ld+json"
        // Static, server-built object; `<` is escaped so the payload cannot close the tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd(contact)).replace(/</g, '\\u003c'),
        }}
      />

      {/* Hero: slides under the translucent sticky header. */}
      <section
        aria-labelledby="hero-title"
        className="relative isolate -mt-[72px] overflow-hidden bg-brand-950 pt-[72px] text-white"
      >
        <HeroBackground />
        <div
          aria-hidden="true"
          className="bg-dots absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,#000_20%,transparent_75%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(94,214,219,.5),transparent)]"
        />

        <div className="mx-auto grid max-w-(--container-page) grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-[clamp(48px,6vw,80px)] px-[clamp(20px,4vw,32px)] pt-[clamp(72px,11vw,136px)] pb-[clamp(72px,9vw,120px)]">
          <div data-reveal="" className="relative z-2 flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/14 bg-white/7 py-[7px] ps-3 pe-3.5 text-[13.5px] font-medium text-on-dark">
              <span className="relative size-2 rounded-full bg-accent-light">
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-accent-light" />
              </span>
              {texts.heroBadge}
            </span>
            <h1
              id="hero-title"
              className="bg-[linear-gradient(180deg,#ffffff_30%,#b9d4f7)] bg-clip-text text-[clamp(32px,4.2vw,54px)] leading-[1.3] font-black tracking-[-.01em] text-balance text-transparent"
            >
              {texts.heroTitle}
            </h1>
            <p className="text-[clamp(16px,1.6vw,19px)] font-semibold text-on-dark">
              {texts.heroSubtitle}
            </p>
            <p className="max-w-[560px] text-[clamp(17px,1.7vw,20px)] leading-loose text-pretty text-on-dark-2">
              {texts.heroLead}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <a
                href="#services"
                className="inline-flex min-h-[52px] items-center gap-2.5 rounded-[14px] bg-[linear-gradient(135deg,#2a6cf0,#1450c8)] px-6 text-base font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.18),0_12px_32px_-10px_rgba(42,108,240,.85)] transition-[transform,box-shadow] duration-250 ease-(--ease-out-soft) hover:-translate-y-0.5 hover:text-white hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,.28),0_18px_44px_-10px_rgba(42,108,240,1)]"
              >
                {homeCopy.heroPrimary}
                <Icon name="arrowStart" size={18} strokeWidth={2} />
              </a>
              <Link
                href="/contact"
                className="inline-flex min-h-[52px] items-center rounded-[14px] border border-white/20 bg-white/6 px-6 text-base font-bold text-white transition-colors hover:border-white/35 hover:bg-white/12 hover:text-white"
              >
                {homeCopy.heroSecondary}
              </Link>
            </div>
          </div>
          <Ecosystem />
        </div>
      </section>

      <section id="about" aria-labelledby="about-title" className="py-[clamp(72px,9vw,120px)]">
        <div className="mx-auto max-w-(--container-page) px-[clamp(20px,4vw,32px)]">
          <div
            data-reveal=""
            className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3"
          >
            <div className="flex items-center gap-4">
              <Image
                src="/brand/bdc-logo.png"
                alt=""
                width={60}
                height={60}
                className="size-[60px] flex-none"
              />
              <div className="flex flex-col gap-2.5">
                <span className="text-sm font-bold text-accent-ink">{texts.aboutKicker}</span>
                <h2 id="about-title" className={sectionTitle}>
                  {texts.aboutTitle}
                </h2>
              </div>
            </div>
            <p className="text-sm text-ink-2">
              <span className="[@media(hover:none)]:hidden">{homeCopy.aboutHint}</span>
              <span className="hidden [@media(hover:none)]:inline">{homeCopy.aboutHintTouch}</span>
            </p>
          </div>
          <div data-reveal="" data-reveal-delay="100">
            <AboutReveal
              text={about}
              address={contact.address}
              kicker={texts.aboutKicker}
              title={texts.aboutTitle}
            />
          </div>
        </div>
      </section>

      <AtAGlance stats={stats} />

      <section
        id="news"
        aria-labelledby="news-title"
        className="border-y border-line bg-white py-[clamp(72px,9vw,120px)]"
      >
        <div className="mx-auto max-w-(--container-page) px-[clamp(20px,4vw,32px)]">
          <div
            data-reveal=""
            className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4"
          >
            <h2 id="news-title" className={sectionTitle}>
              {homeCopy.newsTitle}
            </h2>
            {articles.length === 0 ? null : <NewsCarousel items={articles.map(toCard)} />}
          </div>
          {articles.length === 0 ? (
            <p className="text-[15px] text-ink-2">{homeCopy.newsEmpty}</p>
          ) : null}
        </div>
      </section>

      <ServiceTiles />
      <ChamberLinks />
    </>
  );
}
