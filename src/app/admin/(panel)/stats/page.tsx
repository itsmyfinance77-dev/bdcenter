import Link from 'next/link';
import { BarChart, type BarPoint } from '@/components/admin/bar-chart';
import { AdminHeading, EmptyState, Table, Td } from '@/components/admin/ui';
import { formatNumber } from '@/lib/format';
import {
  STAT_RANGES,
  getDashboardStats,
  type DayValue,
  type StatRange,
} from '@/modules/stats/service';

export const metadata = { title: 'آمار' };

const dayLabel = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Tehran',
});

/** Day key "2026-10-02" -> «۱۰ مهر». Noon avoids any edge of the Tehran day. */
function toPoints(values: DayValue[]): BarPoint[] {
  return values.map(({ day, value }) => ({
    key: day,
    label: dayLabel.format(new Date(`${day}T12:00:00+03:30`)),
    value,
  }));
}

const activityCharts = [
  { key: 'members', title: 'عضو جدید', unit: 'عضو' },
  { key: 'enrollments', title: 'ثبت‌نام دوره', unit: 'ثبت‌نام' },
  { key: 'consulting', title: 'درخواست مشاوره', unit: 'درخواست' },
  { key: 'bookings', title: 'رزرو نوبت', unit: 'رزرو' },
  { key: 'submissions', title: 'فرم‌های ارسال‌شده', unit: 'فرم' },
  { key: 'messages', title: 'پیام تماس', unit: 'پیام' },
] as const;

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const requested = Number((await searchParams).range);
  const range: StatRange = (STAT_RANGES as readonly number[]).includes(requested)
    ? (requested as StatRange)
    : 30;
  const stats = await getDashboardStats(range);

  return (
    <>
      <AdminHeading title="آمار">
        <nav aria-label="بازهٔ زمانی" className="flex gap-1 rounded-control bg-surface-2 p-1">
          {STAT_RANGES.map((days) => (
            <Link
              key={days}
              href={`/admin/stats?range=${days}`}
              aria-current={days === range ? 'page' : undefined}
              className="rounded-[10px] px-3 py-1.5 text-sm font-semibold text-ink-2 aria-[current=page]:bg-white aria-[current=page]:text-brand-900 aria-[current=page]:shadow-sm"
            >
              {formatNumber(days)} روز اخیر
            </Link>
          ))}
        </nav>
      </AdminHeading>

      <ul className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'بازدید صفحه‌ها', value: stats.totals.views },
          { label: 'عضو جدید', value: stats.totals.members },
          { label: 'ثبت‌نام دوره', value: stats.totals.enrollments },
          {
            label: 'درخواست و رزرو',
            value: stats.totals.consulting + stats.totals.bookings,
          },
        ].map((tile) => (
          <li key={tile.label} className="rounded-panel border border-line bg-white p-4">
            <p className="text-sm text-ink-2">{tile.label}</p>
            <p className="mt-1 text-3xl font-bold text-brand-900">{formatNumber(tile.value)}</p>
          </li>
        ))}
      </ul>

      <div className="space-y-6">
        <BarChart title="بازدید روزانهٔ صفحه‌ها" unit="بازدید" points={toPoints(stats.views)} />

        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="mb-3 font-bold text-brand-900">
            فعالیت روزانه
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activityCharts.map((chart) => (
              <BarChart
                key={chart.key}
                compact
                title={chart.title}
                unit={chart.unit}
                points={toPoints(stats.activity[chart.key])}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="top-pages-heading">
          <h2 id="top-pages-heading" className="mb-3 font-bold text-brand-900">
            پربازدیدترین صفحه‌ها
          </h2>
          {stats.topPages.length === 0 ? (
            <EmptyState>هنوز بازدیدی ثبت نشده است.</EmptyState>
          ) : (
            <Table head={['صفحه', 'بازدید']}>
              {stats.topPages.map((page) => (
                <tr key={page.path}>
                  <Td>
                    <a
                      href={page.path}
                      target="_blank"
                      rel="noreferrer"
                      dir="ltr"
                      className="text-primary hover:underline"
                    >
                      {page.path}
                    </a>
                  </Td>
                  <Td>{formatNumber(page.views)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </section>

        <p className="text-xs leading-6 text-ink-2">
          بازدیدها بدون ذخیرهٔ نشانی IP، کوکی یا شناسهٔ بازدیدکننده و فقط به‌صورت شمار روزانهٔ هر
          صفحه ثبت می‌شوند؛ بخش‌های خصوصی (حساب کاربری و پنل مدیریت) شمرده نمی‌شوند. روزها به وقت
          تهران است.
        </p>
      </div>
    </>
  );
}
