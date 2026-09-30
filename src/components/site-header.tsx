import Link from 'next/link';
import { MobileNavDisclosure } from '@/components/mobile-nav-disclosure';
import { mainNav, siteInfo } from '@/content/site';

const linkClass = 'text-sm font-medium text-ink hover:text-primary';

export function SiteHeader() {
  return (
    <header className="relative border-b border-line bg-white">
      <div className="mx-auto flex max-w-(--container-page) items-center justify-between gap-6 px-4 py-4">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-lg font-bold text-brand-900">{siteInfo.name}</span>
          <span className="text-xs text-ink-2">{siteInfo.parentOrg}</span>
        </Link>

        <nav aria-label="ناوبری اصلی" className="hidden items-center gap-6 nav:flex">
          {mainNav.map((item) =>
            'children' in item ? (
              // Opens on hover and whenever focus is inside, so Tab reaches the submenu.
              <div key={item.title} className="group relative">
                <button className={linkClass} type="button" aria-haspopup="true">
                  {item.title}
                </button>
                <div className="invisible absolute end-0 top-full z-10 min-w-48 rounded-card border border-line bg-white p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="block rounded-control px-3 py-2 text-sm text-ink hover:bg-surface-2 focus:bg-surface-2"
                    >
                      {child.title}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={item.href} href={item.href} className={linkClass}>
                {item.title}
              </Link>
            ),
          )}
        </nav>

        {/* Below the nav breakpoint: a native disclosure that works before hydration. */}
        <MobileNavDisclosure className="group nav:hidden">
          <summary className="cursor-pointer list-none rounded-control border border-line px-3 py-1.5 text-sm text-ink [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">منو</span>
            <span className="hidden group-open:inline">بستن</span>
          </summary>
          <nav
            aria-label="ناوبری اصلی"
            className="absolute inset-x-0 top-full z-20 border-b border-line bg-white px-4 py-3 shadow-lg"
          >
            <ul className="space-y-1">
              {mainNav.map((item) =>
                'children' in item ? (
                  <li key={item.title}>
                    <span className="block px-2 pt-2 text-xs font-semibold text-ink-2">
                      {item.title}
                    </span>
                    <ul>
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className="block rounded-control px-4 py-2 text-sm text-ink hover:bg-surface-2"
                          >
                            {child.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block rounded-control px-2 py-2 text-sm font-medium text-ink hover:bg-surface-2"
                    >
                      {item.title}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>
        </MobileNavDisclosure>
      </div>
    </header>
  );
}
