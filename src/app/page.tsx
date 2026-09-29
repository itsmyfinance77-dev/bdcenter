import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ServiceTiles } from '@/components/service-tiles';
import { ChamberLinks } from '@/components/chamber-links';
import { aboutText, siteInfo } from '@/content/site';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
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
            <h2 className="mb-4 text-xl font-bold text-brand-900">اخبار و رویدادهای مرکز</h2>
            <p className="text-sm text-ink-2">
              به‌زودی از طریق داشبورد مدیریت محتوا منتشر می‌شود.
            </p>
          </div>
        </section>

        <ServiceTiles />
        <ChamberLinks />
      </main>
      <SiteFooter />
    </>
  );
}
