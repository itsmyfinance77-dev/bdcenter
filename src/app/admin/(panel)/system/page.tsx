import Link from 'next/link';
import { AdminHeading, EmptyState, Table, Td, secondaryButtonClass } from '@/components/admin/ui';
import { formatDateTime, formatNumber } from '@/lib/format';
import { requireAdmin } from '@/modules/auth/service';
import { BACKUP_STALE_HOURS, getBackupStatus, type BackupFile } from '@/modules/backups/service';
import { listErrorGroups } from '@/modules/errors/service';
import { setErrorResolvedAction } from './actions';

export const metadata = { title: 'وضعیت سامانه' };

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${formatNumber(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`;
  return `${formatNumber(Math.round((bytes / (1024 * 1024)) * 10) / 10)} مگابایت`;
}

function BackupLine({ label, file }: { label: string; file: BackupFile | undefined }) {
  return (
    <p>
      <span className="text-ink-2">{label}: </span>
      {file ? `${formatDateTime(file.takenAt)} — ${formatSize(file.size)}` : 'هنوز نسخه‌ای نیست'}
    </p>
  );
}

async function BackupPanel() {
  const status = await getBackupStatus();
  let alarm = false;
  let body: React.ReactNode;

  if (!status.configured) {
    body = (
      <p className="text-ink-2">
        پوشهٔ پشتیبان (BACKUP_DIR) تنظیم نشده است؛ روی سرور اصلی سرویس پشتیبان‌گیری را راه‌اندازی
        کنید (docs/operations/backup.md).
      </p>
    );
  } else if (!status.readable) {
    alarm = true;
    body = <p className="font-semibold text-danger">پوشهٔ پشتیبان در دسترس نیست.</p>;
  } else {
    alarm = Boolean(status.failure) || status.stale;
    body = (
      <div className="space-y-1">
        {status.failure ? (
          <p className="font-semibold text-danger">
            آخرین پشتیبان‌گیری ناموفق بود:{' '}
            <code dir="ltr" className="font-normal break-all">
              {status.failure}
            </code>
          </p>
        ) : status.stale ? (
          <p className="font-semibold text-danger">
            در {formatNumber(BACKUP_STALE_HOURS)} ساعت گذشته از پایگاه داده پشتیبان گرفته نشده است.
          </p>
        ) : null}
        <BackupLine label="آخرین پشتیبان پایگاه داده" file={status.database[0]} />
        <BackupLine label="آخرین پشتیبان فایل‌ها" file={status.files[0]} />
        <p className="text-ink-2">
          نسخه‌های نگه‌داری‌شده: {formatNumber(status.database.length)} پایگاه داده،{' '}
          {formatNumber(status.files.length)} فایل
        </p>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="backup-heading"
      className={`mb-8 rounded-panel border bg-white p-4 text-sm ${alarm ? 'border-danger/40' : 'border-line'}`}
    >
      <h2 id="backup-heading" className="mb-2 font-bold text-brand-900">
        پشتیبان‌گیری خودکار
      </h2>
      {body}
    </section>
  );
}

export default async function SystemPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  await requireAdmin('ADMIN');
  const showResolved = (await searchParams).show === 'resolved';
  const errors = await listErrorGroups({ resolved: showResolved });

  return (
    <>
      <AdminHeading title="وضعیت سامانه" />
      <BackupPanel />

      <section aria-labelledby="errors-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="errors-heading" className="font-bold text-brand-900">
            {showResolved ? 'خطاهای حل‌شده' : 'خطاهای باز سرور'}
          </h2>
          <Link
            href={showResolved ? '/admin/system' : '/admin/system?show=resolved'}
            className="text-sm text-primary hover:underline"
          >
            {showResolved ? 'نمایش خطاهای باز' : 'نمایش خطاهای حل‌شده'}
          </Link>
        </div>
        {errors.length === 0 ? (
          <EmptyState>
            {showResolved ? 'خطای حل‌شده‌ای نیست.' : 'خطای بازی ثبت نشده است.'}
          </EmptyState>
        ) : (
          <Table head={['خطا', 'مسیر', 'تعداد', 'آخرین بار', '']}>
            {errors.map((error) => (
              <tr key={error.id}>
                <Td>
                  <Link
                    href={`/admin/system/errors/${error.id}`}
                    dir="ltr"
                    className="block max-w-md truncate text-left text-primary hover:underline"
                  >
                    {error.name}: {error.message}
                  </Link>
                </Td>
                <Td>
                  <code dir="ltr" className="text-xs">
                    {error.route ?? '—'}
                  </code>
                </Td>
                <Td>{formatNumber(error.count)}</Td>
                <Td className="whitespace-nowrap">{formatDateTime(error.lastSeenAt)}</Td>
                <Td>
                  <form action={setErrorResolvedAction.bind(null, error.id, !showResolved)}>
                    <button type="submit" className={secondaryButtonClass}>
                      {showResolved ? 'باز کردن' : 'حل شد'}
                    </button>
                  </form>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        <p className="mt-3 text-xs leading-6 text-ink-2">
          خطاهای یکسان یک ردیف با شمارنده می‌شوند. اگر ERROR_ALERT_EMAIL تنظیم شده باشد، برای هر
          خطای تازه (یا خطای حل‌شده‌ای که دوباره رخ دهد) ایمیل فرستاده می‌شود. خطاهای حل‌شده پس از
          ۹۰ روز بی‌تکرار پاک می‌شوند.
        </p>
      </section>
    </>
  );
}
