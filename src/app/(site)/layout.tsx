import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { PageViewBeacon } from '@/components/site/page-view-beacon';
import { RevealOnScroll } from '@/components/site/reveal';
import { getSiteMenu } from '@/modules/settings/service';

/** Public site chrome. The admin panel gets its own layout outside this group. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const menu = await getSiteMenu();
  return (
    <>
      <span id="top" />
      <a
        href="#main"
        className="absolute -top-20 right-4 z-100 rounded-[10px] bg-white px-4 py-2.5 font-bold text-brand-900 transition-[top] duration-200 focus:top-3"
      >
        پرش به محتوای اصلی
      </a>
      <SiteHeader menu={menu} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
      <RevealOnScroll />
      <PageViewBeacon />
    </>
  );
}
