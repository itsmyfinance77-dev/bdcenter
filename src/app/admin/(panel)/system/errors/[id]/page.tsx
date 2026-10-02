import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminHeading, buttonClass, secondaryButtonClass } from '@/components/admin/ui';
import { formatDateTime, formatNumber } from '@/lib/format';
import { requireAdmin } from '@/modules/auth/service';
import { getErrorGroup } from '@/modules/errors/service';
import { setErrorResolvedAction } from '../../actions';

export const metadata = { title: 'جزئیات خطا' };

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code dir="ltr" className="break-all">
      {children}
    </code>
  );
}

export default async function ErrorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin('ADMIN');
  const error = await getErrorGroup((await params).id);
  if (!error) notFound();

  const rows: [string, React.ReactNode][] = [
    ['وضعیت', error.resolvedAt ? `حل‌شده (${formatDateTime(error.resolvedAt)})` : 'باز'],
    ['تعداد رخداد', formatNumber(error.count)],
    ['نخستین بار', formatDateTime(error.firstSeenAt)],
    ['آخرین بار', formatDateTime(error.lastSeenAt)],
    ['مسیر', <Code key="route">{error.route ?? '—'}</Code>],
    [
      'آخرین درخواست',
      <Code key="path">{[error.method, error.lastPath].filter(Boolean).join(' ') || '—'}</Code>,
    ],
    ['نوع', <Code key="type">{error.routeType ?? '—'}</Code>],
    ['شناسهٔ Next.js (digest)', <Code key="digest">{error.digest ?? '—'}</Code>],
  ];

  return (
    <>
      <AdminHeading title="جزئیات خطا">
        <Link href="/admin/system" className={secondaryButtonClass}>
          بازگشت
        </Link>
        <form action={setErrorResolvedAction.bind(null, error.id, !error.resolvedAt)}>
          <button type="submit" className={buttonClass}>
            {error.resolvedAt ? 'باز کردن دوباره' : 'علامت حل‌شده'}
          </button>
        </form>
      </AdminHeading>

      <p
        dir="ltr"
        className="mb-4 rounded-panel border border-line bg-white p-4 text-left font-mono text-sm break-words"
      >
        <strong>{error.name}</strong>: {error.message}
      </p>

      <dl className="mb-6 grid gap-x-6 gap-y-2 rounded-panel border border-line bg-white p-4 text-sm sm:grid-cols-[max-content_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-ink-2">{label}</dt>
            <dd className="m-0">{value}</dd>
          </div>
        ))}
      </dl>

      {error.stack ? (
        <section aria-labelledby="stack-heading">
          <h2 id="stack-heading" className="mb-2 font-bold text-brand-900">
            Stack trace
          </h2>
          <pre
            dir="ltr"
            className="overflow-x-auto rounded-panel border border-line bg-surface-2 p-4 text-left text-xs leading-5"
          >
            {error.stack}
          </pre>
        </section>
      ) : null}
    </>
  );
}
