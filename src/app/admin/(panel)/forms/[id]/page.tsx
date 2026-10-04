import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusForm } from '@/components/admin/status-form';
import {
  AdminHeading,
  Badge,
  EmptyState,
  Pager,
  secondaryButtonClass,
} from '@/components/admin/ui';
import { requestStatusLabel } from '@/content/admin';
import { formatDateTime, formatNumber } from '@/lib/format';
import { pageParam } from '@/lib/params';
import { requireAdmin } from '@/modules/auth/service';
import {
  filterQuery,
  getFormForAdmin,
  hasFilter,
  listStaff,
  listSubmissions,
  parseSubmissionFilter,
  unreadDates,
} from '@/modules/forms/service';
import { setSubmissionStatusAction } from '../actions';
import { SubmissionAnswers } from './submission-answers';

export const metadata = { title: 'درخواست‌های فرم' };

const controlClass = 'rounded-control border border-line bg-white px-3 py-2 text-sm';

export default async function SubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query, admin] = await Promise.all([params, searchParams, requireAdmin()]);
  const form = await getFormForAdmin(id);
  if (!form) notFound();
  const page = pageParam(typeof query.page === 'string' ? query.page : undefined);
  const filter = parseSubmissionFilter(query);
  const [{ items, total, pageCount }, staff] = await Promise.all([
    listSubmissions(form.id, page, filter, admin.id),
    listStaff(),
  ]);
  const staffName = new Map(staff.map((s) => [s.id, s.fullName]));
  const queryString = filterQuery(filter);
  const suffix = queryString ? `?${queryString}` : '';
  const base = `/admin/forms/${form.id}`;

  return (
    <>
      <AdminHeading title={`درخواست‌های «${form.title}»`}>
        <Link href={`${base}/stats${suffix}`} className={secondaryButtonClass}>
          نمودار پاسخ‌ها
        </Link>
        {/* Plain link: a route handler that streams a CSV download. */}
        <a href={`${base}/export${suffix}`} className={secondaryButtonClass}>
          خروجی اکسل (CSV)
        </a>
      </AdminHeading>

      <form
        role="search"
        aria-label="جستجو و فیلتر درخواست‌ها"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-panel border border-line bg-white p-4"
      >
        <label className="flex flex-col gap-1 text-xs text-ink-2">
          جستجو در پاسخ‌ها و یادداشت‌ها
          <input name="q" defaultValue={filter.q} className={`${controlClass} w-60`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-2">
          وضعیت
          <select name="status" defaultValue={filter.status ?? ''} className={controlClass}>
            <option value="">همه</option>
            {Object.entries(requestStatusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-2">
          مسئول پیگیری
          <select name="assignee" defaultValue={filter.assignee ?? ''} className={controlClass}>
            <option value="">همه</option>
            <option value="me">با من</option>
            <option value="none">بدون مسئول</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-2">
          از تاریخ
          <input
            name="from"
            defaultValue={filter.from}
            placeholder="۱۴۰۵/۰۸/۰۱"
            className={`${controlClass} w-32`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-2">
          تا تاریخ
          <input
            name="to"
            defaultValue={filter.to}
            placeholder="۱۴۰۵/۰۸/۳۰"
            className={`${controlClass} w-32`}
          />
        </label>
        <button type="submit" className={secondaryButtonClass}>
          اعمال فیلتر
        </button>
        {hasFilter(filter) ? (
          <Link href={base} className="py-2 text-sm text-primary hover:underline">
            حذف فیلترها
          </Link>
        ) : null}
      </form>
      {unreadDates(filter).map((text) => (
        <p key={text} className="mb-2 text-sm text-danger">
          تاریخ «{text}» خوانده نشد و در فیلتر به کار نرفت؛ آن را مثل ۱۴۰۵/۰۸/۰۱ بنویسید.
        </p>
      ))}
      <p className="mb-3 text-sm text-ink-2" role="status">
        {formatNumber(total)} درخواست{hasFilter(filter) ? ' با این فیلترها' : ''}
      </p>

      {items.length === 0 ? (
        <EmptyState>
          {hasFilter(filter)
            ? 'درخواستی با این فیلترها پیدا نشد.'
            : 'هنوز درخواستی برای این فرم ثبت نشده است.'}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((submission) => (
            <li key={submission.id} className="rounded-panel border border-line bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <time className="text-xs text-ink-2" dateTime={submission.createdAt.toISOString()}>
                  {formatDateTime(submission.createdAt)}
                </time>
                <span className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
                  {submission.assigneeId ? (
                    <span>مسئول: {staffName.get(submission.assigneeId) ?? '—'}</span>
                  ) : null}
                  {submission._count.notes > 0 ? (
                    <span>{formatNumber(submission._count.notes)} یادداشت</span>
                  ) : null}
                  <Badge tone={submission.status}>{requestStatusLabel[submission.status]}</Badge>
                </span>
              </div>
              <SubmissionAnswers submission={submission} fields={form.fields} />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <StatusForm
                  action={setSubmissionStatusAction.bind(null, submission.id, form.id)}
                  current={submission.status}
                  notify
                />
                <Link
                  href={`${base}/submissions/${submission.id}`}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  جزئیات، مسئول و یادداشت‌ها
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pageCount={pageCount} basePath={`${base}${suffix}`} />
      <p className="mt-6 text-xs text-ink-2">
        <Link href="/admin/forms" className="text-primary">
          بازگشت به فهرست فرم‌ها
        </Link>
      </p>
    </>
  );
}
