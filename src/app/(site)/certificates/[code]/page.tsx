import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { certificateVerifyCopy as copy } from '@/content/certificate';
import { formatDate } from '@/lib/format';
import { decodeParam } from '@/lib/params';
import {
  certificateDates,
  normalizeCertificateCode,
  verifyCertificate,
} from '@/modules/training/certificates';
import { CertificateLookupForm } from '../lookup';

export const dynamic = 'force-dynamic';

// A certificate page shows a person's name: never in search engines.
export const metadata: Metadata = {
  title: copy.title,
  robots: { index: false, follow: false },
};

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const typed = decodeParam((await params).code).slice(0, 40);
  const code = normalizeCertificateCode(typed);
  if (code && code !== typed) redirect(`/certificates/${code}`);
  const certificate = code ? await verifyCertificate(code) : null;

  const dates = certificate ? certificateDates(certificate).trim() : '';
  const rows: { label: string; value: string; ltr?: boolean }[] = certificate
    ? [
        { label: 'نام', value: certificate.fullName },
        { label: 'دوره', value: certificate.courseTitle },
        ...(dates ? [{ label: 'زمان دوره', value: dates }] : []),
        { label: 'تاریخ صدور', value: formatDate(certificate.issuedAt) },
        { label: 'شمارهٔ گواهی', value: certificate.code, ltr: true },
      ]
    : [];

  return (
    <>
      <PageHeader title={copy.title} crumbs={[{ title: copy.title, href: '/certificates' }]} />
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
        {!certificate ? (
          <p
            role="status"
            className="rounded-panel border border-danger/30 bg-danger/5 p-5 text-danger"
          >
            {copy.notFound}
          </p>
        ) : (
          <section
            aria-labelledby="certificate-status"
            className={`rounded-panel border bg-white p-6 ${
              certificate.revokedAt ? 'border-danger/40' : 'border-success/40'
            }`}
          >
            <h2
              id="certificate-status"
              className={`mb-4 text-lg font-bold ${certificate.revokedAt ? 'text-danger' : 'text-success'}`}
            >
              {certificate.revokedAt ? copy.revoked : copy.valid}
            </h2>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[max-content_1fr]">
              {rows.map((row) => (
                <div key={row.label} className="contents">
                  <dt className="text-ink-2">{row.label}</dt>
                  <dd className="m-0 font-semibold text-ink">
                    {row.ltr ? <span dir="ltr">{row.value}</span> : row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        <CertificateLookupForm />
      </div>
    </>
  );
}
