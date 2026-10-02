'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { PageBody } from '@/components/site/page-body';

/**
 * Shown when a public page fails on the server. The error itself is already
 * recorded by `onRequestError` (src/instrumentation.ts); the digest lets staff
 * find it in /admin/system.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <PageHeader title="خطایی رخ داد" />
      <PageBody>
        <div className="flex max-w-[560px] flex-col items-start gap-4">
          <p className="text-[17px] leading-loose text-ink-2">
            نمایش این صفحه با مشکل روبه‌رو شد. خطا برای پشتیبانی سایت ثبت شده است؛ لطفاً چند لحظهٔ
            دیگر دوباره تلاش کنید.
          </p>
          {error.digest ? (
            <p className="text-sm text-ink-2">
              کد پیگیری:{' '}
              <code dir="ltr" className="font-mono">
                {error.digest}
              </code>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-12 items-center rounded-control bg-primary px-[22px] font-bold text-white hover:bg-primary-hover"
            >
              تلاش دوباره
            </button>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center rounded-control border border-line bg-white px-[22px] font-bold text-brand-900 hover:border-line-hover"
            >
              صفحه اصلی
            </Link>
          </div>
        </div>
      </PageBody>
    </>
  );
}
