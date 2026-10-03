import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConfirmButton } from '@/components/admin/confirm-button';
import { AdminHeading, secondaryButtonClass } from '@/components/admin/ui';
import { pageCopy } from '@/content/pages';
import { decodeParam } from '@/lib/params';
import { getPageForAdmin, pagePath } from '@/modules/pages/service';
import { deletePageAction } from '../actions';
import { PageForm } from '../page-form';

export const metadata = { title: 'ویرایش صفحه' };

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ slug: rawSlug }, { saved }] = await Promise.all([params, searchParams]);
  const page = await getPageForAdmin(decodeParam(rawSlug));
  if (!page) notFound();

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
        {page.isSystem ? null : (
          <ConfirmButton
            action={deletePageAction.bind(null, page.slug)}
            message={`صفحه «${page.title}» برای همیشه حذف شود؟`}
          >
            حذف
          </ConfirmButton>
        )}
      </AdminHeading>
      {saved ? (
        <p
          role="status"
          className="mb-4 rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
        >
          ذخیره شد.
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
    </>
  );
}
