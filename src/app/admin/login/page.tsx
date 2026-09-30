import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { siteInfo } from '@/content/site';
import { getCurrentAdmin } from '@/modules/auth/service';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'ورود به پنل مدیریت', robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getCurrentAdmin()) redirect('/admin');
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-panel border border-line bg-white p-6 shadow-sm">
        <p className="text-xs text-ink-2">{siteInfo.name}</p>
        <h1 className="mb-6 mt-1 text-xl font-bold text-brand-900">ورود به پنل مدیریت</h1>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
