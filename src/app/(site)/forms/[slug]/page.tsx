import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { FormCard, PageBody } from '@/components/site/page-body';
import { RichBody } from '@/components/rich-body';
import Link from 'next/link';
import { formClosedMessage, formCopy } from '@/content/forms';
import { formatDateTime } from '@/lib/format';
import { getCurrentMember } from '@/modules/members/service';
import { getFormAvailability, getPublishedForm, prefillValues } from '@/modules/forms/service';
import { DynamicForm } from './dynamic-form';

export const dynamic = 'force-dynamic';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const form = await getPublishedForm((await params).slug);
  if (!form) return {};
  return {
    title: form.title,
    description: form.description ?? undefined,
    alternates: { canonical: `/forms/${form.slug}` },
  };
}

export default async function FormPage({ params }: { params: Promise<Params> }) {
  const form = await getPublishedForm((await params).slug);
  if (!form) notFound();
  const member = await getCurrentMember();
  const availability = await getFormAvailability(form, member?.id ?? null);
  const prefill = member
    ? prefillValues(form, {
        fullName: member.fullName,
        phone: member.phone,
        email: member.email,
        nationalId: member.nationalId,
        postalCode: member.postalCode,
        companyName: member.companyName,
        legalNationalId: member.legalNationalId,
      })
    : {};
  const path = `/forms/${encodeURIComponent(form.slug)}`;

  return (
    <>
      <PageHeader
        title={form.title}
        lead={form.descriptionHtml ? undefined : (form.description ?? undefined)}
        crumbs={[{ title: 'فرم‌ها', href: '/forms' }, { title: form.title }]}
      />
      <PageBody narrow>
        <FormCard
          id="form-heading"
          title={form.title}
          requiredNote={availability === 'open'}
          note={
            form.descriptionHtml ? (
              <div className="text-sm">
                <RichBody html={form.descriptionHtml} markdown={null} />
              </div>
            ) : null
          }
        >
          {availability === 'open' ? (
            <>
              {Object.keys(prefill).length > 0 ? (
                <p className="mb-4 text-[13px] leading-7 text-ink-2">{formCopy.prefillNote}</p>
              ) : null}
              <DynamicForm form={form} prefill={prefill} />
            </>
          ) : (
            <div
              role="status"
              className="flex flex-col items-start gap-3 rounded-control border border-line bg-surface px-4 py-4 text-sm leading-7 text-ink"
            >
              {availability === 'not-yet'
                ? formClosedMessage['not-yet'](formatDateTime(form.rules.opensAt!))
                : formClosedMessage[availability]()}
              {availability === 'sign-in' ? (
                <Link
                  href={`/account/login?next=${encodeURIComponent(path)}`}
                  className="font-bold text-primary hover:underline"
                >
                  {formCopy.signIn}
                </Link>
              ) : null}
            </div>
          )}
        </FormCard>
      </PageBody>
    </>
  );
}
