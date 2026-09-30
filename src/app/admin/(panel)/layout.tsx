import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/admin-nav';
import { adminNav, adminRoleLabel } from '@/content/admin';
import { siteInfo } from '@/content/site';
import { requireAdmin } from '@/modules/auth/service';
import { logoutAction } from './actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'پنل مدیریت', template: '%s | پنل مدیریت' },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const items = adminNav.filter((item) => !item.adminOnly || admin.role === 'ADMIN');

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <Link href="/admin" className="font-bold text-brand-900">
              پنل مدیریت {siteInfo.name}
            </Link>
            <p className="text-xs text-ink-2">
              {admin.fullName} · {adminRoleLabel[admin.role]}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-primary hover:underline" target="_blank">
              مشاهده سایت
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="text-ink-2 hover:text-danger">
                خروج
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <aside>
          <AdminNav items={items.map(({ href, title }) => ({ href, title }))} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
