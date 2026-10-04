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
import { formatDateTime, toPersianDigits } from '@/lib/format';
import { pageParam } from '@/lib/params';
import { storedFileSchema } from '@/modules/files/service';
import {
  displayValue,
  getFormForAdmin,
  listSubmissions,
  submissionFields,
} from '@/modules/forms/service';
import { setSubmissionStatusAction } from '../actions';

export const metadata = { title: 'درخواست‌های فرم' };

/** Answers shown left to right (numbers and codes). */
const LTR_TYPES = new Set([
  'PHONE',
  'MOBILE',
  'NUMBER',
  'NATIONAL_CODE',
  'LEGAL_ID',
  'POSTAL_CODE',
  'TIME',
]);

export default async function SubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const form = await getFormForAdmin(id);
  if (!form) notFound();
  const page = pageParam(query.page);
  const { items, pageCount } = await listSubmissions(form.id, page);

  return (
    <>
      <AdminHeading title={`درخواست‌های «${form.title}»`}>
        {/* Plain link: a route handler that streams a CSV download. */}
        <a href={`/admin/forms/${form.id}/export`} className={secondaryButtonClass}>
          خروجی اکسل (CSV)
        </a>
      </AdminHeading>
      {items.length === 0 ? (
        <EmptyState>هنوز درخواستی برای این فرم ثبت نشده است.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((submission) => {
            const data = submission.data as Record<string, unknown>;
            return (
              <li key={submission.id} className="rounded-panel border border-line bg-white p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <time
                    className="text-xs text-ink-2"
                    dateTime={submission.createdAt.toISOString()}
                  >
                    {formatDateTime(submission.createdAt)}
                  </time>
                  <Badge tone={submission.status}>{requestStatusLabel[submission.status]}</Badge>
                </div>
                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[200px_1fr]">
                  {submissionFields(submission, form.fields).map((field) => {
                    const value = data[field.key];
                    const file = storedFileSchema.safeParse(value);
                    return (
                      <div key={field.key} className="contents">
                        <dt className="text-ink-2">{field.label}</dt>
                        <dd className="whitespace-pre-line text-ink">
                          {file.success ? (
                            <a
                              href={`/admin/submissions/${submission.id}/files/${field.key}`}
                              className="text-primary hover:underline"
                            >
                              دانلود {file.data.originalName}
                            </a>
                          ) : field.type === 'EMAIL' ? (
                            <span dir="ltr">{displayValue(value, field) || '—'}</span>
                          ) : LTR_TYPES.has(field.type) ? (
                            <span dir="ltr">
                              {toPersianDigits(displayValue(value, field)) || '—'}
                            </span>
                          ) : (
                            toPersianDigits(displayValue(value, field)) || '—'
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
                <div className="mt-4">
                  <StatusForm
                    action={setSubmissionStatusAction.bind(null, submission.id, form.id)}
                    current={submission.status}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pager page={page} pageCount={pageCount} basePath={`/admin/forms/${form.id}`} />
      <p className="mt-6 text-xs text-ink-2">
        <Link href="/admin/forms" className="text-primary">
          بازگشت به فهرست فرم‌ها
        </Link>
      </p>
    </>
  );
}
