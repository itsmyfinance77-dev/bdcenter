import type { Metadata } from 'next';
import { siteInfo } from '@/content/site';
import { ForgotForm } from './forgot-forms';

export const metadata: Metadata = { title: 'بازیابی رمز عبور', robots: { index: false } };

export default function ForgotPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-panel border border-line bg-white p-6 shadow-sm">
        <p className="text-xs text-ink-2">{siteInfo.name}</p>
        <h1 className="mt-1 mb-2 text-xl font-bold text-brand-900">بازیابی رمز عبور</h1>
        <p className="mb-6 text-sm leading-7 text-ink-2">
          ایمیل حساب پنل خود را بنویسید تا پیوندی برای انتخاب رمز تازه برایتان فرستاده شود.
        </p>
        <ForgotForm />
      </div>
    </main>
  );
}
