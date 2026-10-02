'use client';

import './globals.css';

/** Last-resort page when even the root layout fails. Kept plain: nothing here may fail too. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="grid min-h-dvh place-items-center bg-surface p-6 font-sans text-ink">
        <main className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold text-brand-900">خطایی رخ داد</h1>
          <p className="leading-loose text-ink-2">
            سایت با مشکل روبه‌رو شد و خطا ثبت شده است. لطفاً چند لحظهٔ دیگر دوباره تلاش کنید.
          </p>
          {error.digest ? (
            <p className="text-sm text-ink-2">
              کد پیگیری: <code dir="ltr">{error.digest}</code>
            </p>
          ) : null}
          {/* A full reload, not client navigation: the root layout itself has to render again. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="inline-block rounded-control bg-primary px-5 py-3 font-bold text-white"
          >
            بازگشت به صفحه اصلی
          </a>
        </main>
      </body>
    </html>
  );
}
