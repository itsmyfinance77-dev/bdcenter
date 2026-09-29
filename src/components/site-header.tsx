import Link from 'next/link';
import { mainNav, siteInfo } from '@/content/site';

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-(--container-page) items-center justify-between gap-6 px-4 py-4">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-lg font-bold text-brand-900">{siteInfo.name}</span>
          <span className="text-xs text-ink-2">{siteInfo.parentOrg}</span>
        </Link>

        <nav aria-label="ناوبری اصلی" className="hidden items-center gap-6 nav:flex">
          {mainNav.map((item) =>
            'children' in item ? (
              <div key={item.title} className="group relative">
                <button className="text-sm font-medium text-ink hover:text-primary" type="button">
                  {item.title}
                </button>
                <div className="invisible absolute end-0 top-full z-10 min-w-48 rounded-card border border-line bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="block rounded-control px-3 py-2 text-sm text-ink hover:bg-surface-2"
                    >
                      {child.title}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-ink hover:text-primary"
              >
                {item.title}
              </Link>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}
