import Link from 'next/link';

export function NotFoundMessage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-brand-900">صفحه پیدا نشد</h1>
      <p className="mt-3 text-sm text-ink-2">
        صفحه‌ای که به دنبال آن هستید وجود ندارد یا جابه‌جا شده است.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}
