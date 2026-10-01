import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { siteInfo } from '@/content/site';
import { getCurrentAdmin } from '@/modules/auth/service';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'ورود به پنل مدیریت', robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; expired?: string }>;
}) {
  if (await getCurrentAdmin()) redirect('/admin');
  const { next, expired } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-panel border border-line bg-white p-6 shadow-sm">
        <p className="text-xs text-ink-2">{siteInfo.name}</p>
        <h1 className="mb-6 mt-1 text-xl font-bold text-brand-900">ورود به پنل مدیریت</h1>
        {expired ? (
          <p
            role="status"
            className="mb-4 rounded-control border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
          >
            مهلت مرحلهٔ دوم تمام شد. دوباره وارد شوید.
          </p>
        ) : null}
        <LoginForm next={next} />
      </div>
    </main>
  );
}
