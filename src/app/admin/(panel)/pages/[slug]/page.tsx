import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConfirmButton } from '@/components/admin/confirm-button';
import { AdminHeading, secondaryButtonClass } from '@/components/admin/ui';
import { pageCopy } from '@/content/pages';
import { decodeParam } from '@/lib/params';
import { formatDateTime } from '@/lib/format';
import { listAdmins } from '@/modules/auth/users';
import { getPageForAdmin, listPageRevisions, pagePath } from '@/modules/pages/service';
import { deletePageAction, restoreRevisionAction } from '../actions';
import { PageForm } from '../page-form';
import { requireAdmin } from '@/modules/auth/service';

export const metadata = { title: 'ویرایش صفحه' };

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; restored?: string }>;
}) {
  await requireAdmin();
  const [{ slug: rawSlug }, { saved, restored }] = await Promise.all([params, searchParams]);
  const page = await getPageForAdmin(decodeParam(rawSlug));
  if (!page) notFound();
  const [revisions, admins] = await Promise.all([listPageRevisions(page.slug), listAdmins()]);
  const adminName = new Map(admins.map((admin) => [admin.id, admin.fullName]));

  const initial = {
    status: page.status,
    title: page.title,
    slug: page.isSystem ? '' : page.slug,
    body: page.html,
    seoDesc: page.seoDesc,
  };

  return (
    <>
      <AdminHeading title={`ویرایش «${page.title}»`}>
        {page.status === 'PUBLISHED' ? (
          <Link href={pagePath(page.slug)} target="_blank" className={secondaryButtonClass}>
            مشاهده در سایت
          </Link>
        ) : null}
        <Link
          href={`/admin/preview/pages/${encodeURIComponent(page.slug)}`}
          target="_blank"
          className={secondaryButtonClass}
        >
          پیش‌نمایش
        </Link>
        {page.isSystem ? null : (
          <ConfirmButton
            action={deletePageAction.bind(null, page.slug)}
            message={`صفحه «${page.title}» برای همیشه حذف شود؟`}
          >
            حذف
          </ConfirmButton>
        )}
      </AdminHeading>
      {saved === '1' || restored ? (
        <p
          role="status"
          className="mb-4 rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
        >
          {restored ? 'نسخهٔ انتخاب‌شده برگردانده شد.' : 'ذخیره شد.'}
        </p>
      ) : null}
      {page.status !== 'PUBLISHED' && page.html.includes('[') ? (
        <p className="mb-4 rounded-control border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          {pageCopy.draftWarning}
        </p>
      ) : null}
      <PageForm
        key={page.updatedAt?.toISOString() ?? 'new'}
        slug={page.slug}
        isSystem={page.isSystem}
        initial={initial}
      />

      <section aria-labelledby="revisions-heading" className="mt-8">
        <h2 id="revisions-heading" className="mb-1 text-lg font-bold text-brand-900">
          نسخه‌های قبلی
        </h2>
        <p className="mb-3 text-sm leading-7 text-ink-2">
          پیش از هر ذخیره، متن قبلی صفحه اینجا نگه داشته می‌شود (۳۰ نسخهٔ آخر). با «پیش‌نمایش»
          ببینید و با «بازگرداندن» آن را دوباره متن صفحه کنید؛ متن فعلی هم به این فهرست اضافه
          می‌شود.
        </p>
        {revisions.length === 0 ? (
          <p className="text-sm text-ink-2">هنوز نسخهٔ قبلی‌ای وجود ندارد.</p>
        ) : (
          <ul className="divide-y divide-line rounded-panel border border-line bg-white">
            {revisions.map((revision) => (
              <li
                key={revision.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <span>
                  <span className="font-medium text-ink">{revision.title}</span>
                  <span className="block text-xs text-ink-2">
                    تا {formatDateTime(revision.createdAt)}
                    {revision.replacedById && adminName.get(revision.replacedById)
                      ? ` · جایگزین‌شده توسط ${adminName.get(revision.replacedById)}`
                      : null}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <Link
                    href={`/admin/preview/pages/${encodeURIComponent(page.slug)}?revision=${revision.id}`}
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    پیش‌نمایش
                  </Link>
                  <ConfirmButton
                    action={restoreRevisionAction.bind(null, page.slug, revision.id)}
                    message="متن صفحه به این نسخه برگردانده شود؟"
                    className={secondaryButtonClass}
                  >
                    بازگرداندن
                  </ConfirmButton>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
