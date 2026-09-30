'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminNav({ items }: { items: { href: string; title: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="منوی پنل مدیریت">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {items.map((item) => {
          const active =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`block rounded-control px-3 py-2 text-sm ${
                  active
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-ink hover:bg-surface-2'
                }`}
              >
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
