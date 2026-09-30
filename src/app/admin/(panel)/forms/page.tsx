import Link from 'next/link';
import { AdminHeading, Badge, ButtonLink, EmptyState, Table, Td } from '@/components/admin/ui';
import { contentStatusLabel } from '@/content/admin';
import { formatNumber } from '@/lib/format';
import { requireAdmin } from '@/modules/auth/service';
import { listFormsForAdmin } from '@/modules/forms/service';

export const metadata = { title: 'فرم‌ها و درخواست‌ها' };

export default async function FormsAdminPage() {
  const admin = await requireAdmin();
  const forms = await listFormsForAdmin();
  const canEdit = admin.role === 'ADMIN';

  return (
    <>
      <AdminHeading title="فرم‌ها و درخواست‌ها">
        {canEdit ? <ButtonLink href="/admin/forms/new">فرم جدید</ButtonLink> : null}
      </AdminHeading>
      {forms.length === 0 ? (
        <EmptyState>هنوز فرمی ساخته نشده است.</EmptyState>
      ) : (
        <Table head={['فرم', 'وضعیت', 'فیلدها', 'درخواست‌ها', 'جدید', '']}>
          {forms.map((form) => (
            <tr key={form.id}>
              <Td>
                <Link
                  href={`/admin/forms/${form.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {form.title}
                </Link>
                <p className="text-xs text-ink-2" dir="ltr">
                  /forms/{form.slug}
                </p>
              </Td>
              <Td>
                <Badge tone={form.status}>{contentStatusLabel[form.status]}</Badge>
              </Td>
              <Td>{formatNumber(form._count.fields)}</Td>
              <Td>{formatNumber(form._count.submissions)}</Td>
              <Td>
                {form.newSubmissions > 0 ? (
                  <Badge tone="NEW">{formatNumber(form.newSubmissions)}</Badge>
                ) : (
                  '—'
                )}
              </Td>
              <Td>
                {canEdit ? (
                  <Link
                    href={`/admin/forms/${form.id}/edit`}
                    className="text-sm text-primary hover:underline"
                  >
                    ویرایش فرم
                  </Link>
                ) : null}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
