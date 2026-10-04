import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminHeading, EmptyState } from '@/components/admin/ui';
import { formatNumber } from '@/lib/format';
import { requireAdmin } from '@/modules/auth/service';
import {
  countAnswers,
  filterQuery,
  getFormForAdmin,
  hasFilter,
  parseSubmissionFilter,
} from '@/modules/forms/service';

export const metadata = { title: 'نمودار پاسخ‌های فرم' };

const percent = new Intl.NumberFormat('fa-IR', { style: 'percent', maximumFractionDigits: 0 });

/**
 * One horizontal bar per option of each choice, yes/no and score field,
 * over the submissions the list's filters match. The numbers are written
 * beside each bar, so the chart reads without colour or hover.
 */
export default async function FormStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query, admin] = await Promise.all([params, searchParams, requireAdmin()]);
  const form = await getFormForAdmin(id);
  if (!form) notFound();
  const filter = parseSubmissionFilter(query);
  const { total, fields } = await countAnswers(form, filter, admin.id);
  const queryString = filterQuery(filter);

  return (
    <>
      <AdminHeading title={`نمودار پاسخ‌های «${form.title}»`} />
      <p className="mb-4 text-sm text-ink-2">
        بر پایهٔ {formatNumber(total)} درخواست
        {hasFilter(filter) ? ' با همان فیلترهای فهرست درخواست‌ها' : ''}.
      </p>
      {fields.length === 0 ? (
        <EmptyState>
          این فرم فیلد چندگزینه‌ای، بله/خیر یا امتیازی ندارد که نمودار داشته باشد.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {fields.map((field) => {
            const max = Math.max(1, ...field.rows.map((row) => row.count));
            return (
              <section
                key={field.key}
                aria-labelledby={`stat-${field.key}`}
                className="rounded-panel border border-line bg-white p-5"
              >
                <h2 id={`stat-${field.key}`} className="text-sm font-bold text-ink">
                  {field.label}
                </h2>
                <p className="mb-3 text-xs text-ink-2">
                  {formatNumber(field.answered)} نفر پاسخ داده‌اند
                </p>
                <ul className="space-y-2">
                  {field.rows.map((row) => (
                    <li
                      key={row.label}
                      className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm"
                    >
                      <span className="truncate text-ink" title={row.label}>
                        {row.label}
                      </span>
                      <span className="h-3 rounded-chip bg-surface" aria-hidden="true">
                        <span
                          className="block h-3 rounded-chip bg-primary"
                          style={{ width: `${(row.count / max) * 100}%` }}
                        />
                      </span>
                      <span className="text-xs text-ink-2 tabular-nums">
                        {formatNumber(row.count)}
                        {field.answered > 0
                          ? ` (${percent.format(row.count / field.answered)})`
                          : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <p className="mt-6 text-xs text-ink-2">
        <Link
          href={`/admin/forms/${form.id}${queryString ? `?${queryString}` : ''}`}
          className="text-primary"
        >
          بازگشت به درخواست‌های این فرم
        </Link>
      </p>
    </>
  );
}
