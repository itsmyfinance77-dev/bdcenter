import Link from 'next/link';
import { formatNumber } from '@/lib/format';

/** Small presentational pieces shared by admin pages. */

export function AdminHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-bold text-brand-900">{title}</h1>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export const buttonClass =
  'inline-block rounded-control bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60';
export const secondaryButtonClass =
  'inline-block rounded-control border border-line bg-white px-4 py-2 text-sm text-ink hover:border-line-hover';
export const dangerButtonClass =
  'inline-block rounded-control border border-danger/40 bg-white px-3 py-1.5 text-xs text-danger hover:bg-danger/10';

export function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={buttonClass}>
      {children}
    </Link>
  );
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-panel border border-line bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-surface-2 text-start text-xs text-ink-2">
          <tr>
            {head.map((title) => (
              <th key={title} className="px-4 py-3 text-start font-medium">
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-panel border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-ink-2">
      {children}
    </p>
  );
}

const badgeTones = {
  NEW: 'bg-primary/10 text-primary',
  IN_REVIEW: 'bg-warning/15 text-warning',
  ACCEPTED: 'bg-success/10 text-success',
  DONE: 'bg-success/10 text-success',
  REJECTED: 'bg-danger/10 text-danger',
  DRAFT: 'bg-surface-2 text-ink-2',
  PUBLISHED: 'bg-success/10 text-success',
  ARCHIVED: 'bg-surface-2 text-ink-2',
} as const;

export function Badge({
  tone,
  children,
}: {
  tone: keyof typeof badgeTones;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-block rounded-chip px-2 py-0.5 text-xs ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

/** Previous/next links for a `?page=` query. */
export function Pager({
  page,
  pageCount,
  basePath,
}: {
  page: number;
  pageCount: number;
  basePath: string;
}) {
  if (pageCount <= 1) return null;
  const href = (p: number) => `${basePath}${basePath.includes('?') ? '&' : '?'}page=${p}`;
  return (
    <nav aria-label="صفحه‌بندی" className="mt-4 flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="text-primary">
          قبلی
        </Link>
      ) : (
        <span />
      )}
      <span className="text-ink-2">
        صفحه {formatNumber(page)} از {formatNumber(pageCount)}
      </span>
      {page < pageCount ? (
        <Link href={href(page + 1)} className="text-primary">
          بعدی
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
