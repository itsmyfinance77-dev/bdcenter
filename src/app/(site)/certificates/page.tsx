import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { certificateVerifyCopy as copy } from '@/content/certificate';
import { normalizeCertificateCode } from '@/modules/training/certificates';
import { CertificateLookupForm } from './lookup';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: copy.title,
  robots: { index: false, follow: false },
};

export default async function CertificateLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const raw = (await searchParams).code;
  const typed = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 40).trim() ?? '';
  const code = typed ? normalizeCertificateCode(typed) : null;
  if (code) redirect(`/certificates/${code}`);

  return (
    <>
      <PageHeader title={copy.title} lead={copy.lead} crumbs={[{ title: copy.title }]} />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
        <CertificateLookupForm defaultValue={typed} />
        {typed ? (
          <p role="status" className="text-sm text-danger">
            {copy.notFound}
          </p>
        ) : null}
      </div>
    </>
  );
}
