import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

/** Public site chrome. The admin panel gets its own layout outside this group. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:shadow"
      >
        پرش به محتوای اصلی
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
