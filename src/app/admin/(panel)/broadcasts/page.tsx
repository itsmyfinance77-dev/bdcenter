import { AdminHeading, EmptyState, Table, Td } from '@/components/admin/ui';
import { formatDateTime, formatNumber } from '@/lib/format';
import { requireAdmin } from '@/modules/auth/service';
import { listBroadcasts, MAX_TEXT, memberAudienceCounts } from '@/modules/broadcasts/service';
import { listCourseAudiences } from '@/modules/training/service';
import { BroadcastForm } from './broadcast-form';

export const metadata = { title: 'پیامک گروهی' };
export const dynamic = 'force-dynamic';

export default async function BroadcastsPage() {
  await requireAdmin('ADMIN');
  const [counts, courses, history] = await Promise.all([
    memberAudienceCounts(),
    listCourseAudiences(),
    listBroadcasts(),
  ]);

  return (
    <>
      <AdminHeading title="پیامک گروهی" />
      <section className="mb-8 rounded-panel border border-line bg-white p-6">
        <p className="mb-4 text-sm leading-7 text-ink-2">
          یک پیامک برای گروهی از اعضا بفرستید؛ مثلاً «جلسهٔ فردای دوره لغو شد». فقط اعضای فعال پیامک
          می‌گیرند و هر شماره یک بار.
        </p>
        <BroadcastForm counts={counts} courses={courses} maxText={MAX_TEXT} />
      </section>

      <h2 className="mb-3 text-lg font-bold text-brand-900">پیامک‌های فرستاده‌شده</h2>
      {history.length === 0 ? (
        <EmptyState>هنوز پیامک گروهی فرستاده نشده است.</EmptyState>
      ) : (
        <Table head={['زمان', 'گیرندگان', 'متن', 'تعداد', 'فرستاده', 'ناموفق', 'وضعیت']}>
          {history.map((row) => (
            <tr key={row.id}>
              <Td>{formatDateTime(row.createdAt)}</Td>
              <Td>{row.audienceLabel}</Td>
              <Td>
                <span className="line-clamp-2 max-w-xs whitespace-pre-line">{row.text}</span>
              </Td>
              <Td>{formatNumber(row.recipients)}</Td>
              <Td>{formatNumber(row.sent)}</Td>
              <Td>
                {row.failed > 0 ? (
                  <span className="text-danger">{formatNumber(row.failed)}</span>
                ) : (
                  formatNumber(0)
                )}
              </Td>
              <Td>{row.finishedAt ? 'تمام شد' : 'در حال ارسال'}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
