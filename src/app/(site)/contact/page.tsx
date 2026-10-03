import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { FormCard, InfoCard, PageBody } from '@/components/site/page-body';
import { toPersianDigits } from '@/lib/format';
import { getContactInfo } from '@/modules/settings/service';
import { ContactForm } from './contact-form';

export const metadata: Metadata = {
  title: 'تماس با ما',
  description: 'اطلاعات تماس و فرم ارسال پیام به مرکز توسعه کسب‌وکار اتاق بازرگانی یزد.',
  alternates: { canonical: '/contact' },
};

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const { address, postalCode, phone, phoneExtension, email } = await getContactInfo();
  return (
    <>
      <PageHeader title="تماس با ما" crumbs={[{ title: 'تماس با ما' }]} />
      <PageBody>
        <div className="grid items-start gap-[clamp(24px,4vw,48px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <section aria-labelledby="contact-info-heading" className="flex flex-col gap-5">
            <h2 id="contact-info-heading" className="text-xl font-extrabold text-brand-900">
              اطلاعات تماس
            </h2>
            {/* OQ-BD-02, OQ-BD-03: unconfirmed postal code and email stay hidden. */}
            <ul className="flex flex-col gap-3">
              <InfoCard icon="pin" label="آدرس">
                {address}
              </InfoCard>
              <InfoCard icon="phone" label="تلفن">
                <a
                  href={`tel:${phone.replace(/\D/g, '')}`}
                  dir="ltr"
                  className="self-start font-bold text-brand-900"
                >
                  {toPersianDigits(phone)}
                </a>
                {phoneExtension ? <span>داخلی {toPersianDigits(phoneExtension)}</span> : null}
              </InfoCard>
              {email ? (
                <InfoCard icon="mail" label="ایمیل">
                  <a href={`mailto:${email}`} dir="ltr" className="self-start font-bold">
                    {email}
                  </a>
                </InfoCard>
              ) : null}
              {postalCode ? (
                <InfoCard icon="box" label="کدپستی">
                  {toPersianDigits(postalCode)}
                </InfoCard>
              ) : null}
            </ul>
          </section>
          <FormCard id="contact-form-heading" title="ارسال پیام">
            <ContactForm />
          </FormCard>
        </div>
      </PageBody>
    </>
  );
}
