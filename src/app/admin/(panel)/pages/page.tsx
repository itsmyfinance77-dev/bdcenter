import Link from 'next/link';
import { AdminHeading, Badge, ButtonLink, Table, Td } from '@/components/admin/ui';
import { contentStatusLabel } from '@/content/admin';
import { formatDateTime } from '@/lib/format';
import { listPagesForAdmin } from '@/modules/pages/service';
import { requireAdmin } from '@/modules/auth/service';

export const metadata = { title: 'صفحه‌ها' };

export default async function PagesAdminPage() {
  await requireAdmin();
  const pages = await listPagesForAdmin();
  return (
    <>
      <AdminHeading title="صفحه‌ها">
        <ButtonLink href="/admin/pages/new">صفحه جدید</ButtonLink>
      </AdminHeading>
      <Table head={['عنوان', 'آدرس', 'وضعیت', 'آخرین ویرایش']}>
        {pages.map((page) => (
          <tr key={page.slug}>
            <Td>
              <Link
                href={`/admin/pages/${encodeURIComponent(page.slug)}`}
                className="font-medium text-primary hover:underline"
              >
                {page.title}
              </Link>
              {page.isSystem ? <p className="text-xs text-ink-2">صفحه ثابت سایت</p> : null}
            </Td>
            <Td>
              <span dir="ltr">{page.path}</span>
            </Td>
            <Td>
              {page.status ? (
                <Badge tone={page.status}>{contentStatusLabel[page.status]}</Badge>
              ) : (
                <span className="text-xs text-ink-2">هنوز ذخیره نشده</span>
              )}
            </Td>
            <Td>{page.updatedAt ? formatDateTime(page.updatedAt) : '—'}</Td>
          </tr>
        ))}
      </Table>
      <p className="mt-2 text-xs text-ink-2">
        «درباره مرکز» تا وقتی منتشر نشود، متن تأییدشدهٔ فعلی را نشان می‌دهد. «حریم خصوصی» و «قوانین»
        تا انتشار، پیام «در حال آماده‌سازی» دارند و در پاورقی دیده نمی‌شوند.
      </p>
    </>
  );
}
