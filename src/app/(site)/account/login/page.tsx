import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { memberCopy } from '@/content/members';
import { getCurrentMember, OTP_TTL_SECONDS } from '@/modules/members/service';
import { MemberLoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: memberCopy.loginTitle,
  robots: { index: false, follow: false },
};

export default async function MemberLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getCurrentMember()) redirect('/account');
  const { next } = await searchParams;
  return (
    <>
      <PageHeader
        title={memberCopy.loginTitle}
        lead={memberCopy.loginLead}
        crumbs={[{ title: memberCopy.loginTitle }]}
      />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-panel border border-line bg-white p-6">
          <MemberLoginForm next={next} codeTtlSeconds={OTP_TTL_SECONDS} />
        </div>
      </div>
    </>
  );
}
