import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { siteInfo } from '@/content/site';
import { getCurrentAdmin, pendingSecondStep } from '@/modules/auth/service';
import { SecondStepForm } from './second-step-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'ورود دومرحله‌ای', robots: { index: false } };

export default async function SecondStepPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getCurrentAdmin()) redirect('/admin');
  const pending = await pendingSecondStep();
  if (!pending) redirect('/admin/login?expired=1');
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-panel border border-line bg-white p-6 shadow-sm">
        <p className="text-xs text-ink-2">{siteInfo.name}</p>
        <h1 className="mt-1 mb-2 text-xl font-bold text-brand-900">ورود دومرحله‌ای</h1>
        <p className="mb-6 text-sm leading-7 text-ink-2">
          کد ۶ رقمی برنامهٔ احراز هویت (مثل Google Authenticator) را برای{' '}
          <span dir="ltr">{pending.email}</span> وارد کنید. اگر به گوشی دسترسی ندارید، یکی از کدهای
          بازیابی را وارد کنید.
        </p>
        <SecondStepForm next={next} />
        <Link href="/admin/login" className="mt-4 inline-block text-xs text-ink-2 hover:underline">
          بازگشت به ورود
        </Link>
      </div>
    </main>
  );
}
