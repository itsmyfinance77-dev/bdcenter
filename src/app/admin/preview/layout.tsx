import type { Metadata } from 'next';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { requireAdmin } from '@/modules/auth/service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'پیش‌نمایش', template: 'پیش‌نمایش: %s' },
  robots: { index: false, follow: false },
};

/**
 * Drafts shown with the public site's header and footer, for staff only. It
 * lives under /admin because the session cookie is scoped to that path.
 */
export default async function PreviewLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <p
        role="status"
        className="sticky top-0 z-100 bg-warning px-4 py-2 text-center text-sm font-bold text-white"
      >
        پیش‌نمایش — این صفحه همان‌طور است که پس از انتشار دیده می‌شود. فقط کارمندان آن را می‌بینند.
      </p>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
