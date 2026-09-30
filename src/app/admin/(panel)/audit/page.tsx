import { AdminHeading, EmptyState, Table, Td } from '@/components/admin/ui';
import { formatDateTime } from '@/lib/format';
import { listRecentAudit } from '@/modules/audit/service';
import { requireAdmin } from '@/modules/auth/service';

export const metadata = { title: 'گزارش فعالیت' };

const actionLabel: Record<string, string> = {
  'auth.login': 'ورود به پنل',
  'content.create': 'ایجاد مطلب',
  'content.update': 'ویرایش مطلب',
  'content.delete': 'حذف مطلب',
  'consulting.status': 'تغییر وضعیت درخواست مشاوره',
  'form.create': 'ایجاد فرم',
  'form.update': 'ویرایش فرم',
  'form.submission.status': 'تغییر وضعیت درخواست فرم',
  'form.submission.export': 'خروجی گرفتن از درخواست‌ها',
  'form.submission.file': 'دانلود پیوست',
  'admin.create': 'ساخت کاربر',
  'admin.activate': 'فعال کردن کاربر',
  'admin.deactivate': 'غیرفعال کردن کاربر',
  'admin.password': 'تغییر رمز عبور',
};

export default async function AuditPage() {
  await requireAdmin('ADMIN');
  const entries = await listRecentAudit(200);

  return (
    <>
      <AdminHeading title="گزارش فعالیت" />
      {entries.length === 0 ? (
        <EmptyState>هنوز فعالیتی ثبت نشده است.</EmptyState>
      ) : (
        <Table head={['زمان', 'کاربر', 'فعالیت', 'جزئیات']}>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <Td className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</Td>
              <Td>{entry.actor?.fullName ?? '—'}</Td>
              <Td>{actionLabel[entry.action] ?? entry.action}</Td>
              <Td className="text-xs text-ink-2">
                {entry.metadata ? (
                  <code dir="ltr" className="break-all">
                    {JSON.stringify(entry.metadata)}
                  </code>
                ) : null}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
