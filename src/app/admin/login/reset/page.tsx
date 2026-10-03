import type { Metadata } from 'next';
import Link from 'next/link';
import { siteInfo } from '@/content/site';
import { resetTokenValid } from '@/modules/auth/password-reset';
import { ResetForm } from '../forgot/forgot-forms';

export const metadata: Metadata = {
  title: 'انتخاب رمز تازه',
  robots: { index: false },
  // The token is in the address: never pass it on to another site.
  referrer: 'no-referrer',
};

export const dynamic = 'force-dynamic';

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? '';
  const valid = await resetTokenValid(token);
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-panel border border-line bg-white p-6 shadow-sm">
        <p className="text-xs text-ink-2">{siteInfo.name}</p>
        <h1 className="mt-1 mb-6 text-xl font-bold text-brand-900">انتخاب رمز تازه</h1>
        {valid ? (
          <ResetForm token={token} />
        ) : (
          <div className="space-y-4 text-sm leading-7 text-ink">
            <p>این پیوند دیگر معتبر نیست؛ هر پیوند فقط یک بار و تا ۳۰ دقیقه کار می‌کند.</p>
            <Link href="/admin/login/forgot" className="font-semibold text-primary hover:underline">
              درخواست پیوند تازه
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
