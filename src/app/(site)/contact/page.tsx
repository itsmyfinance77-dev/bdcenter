import type { Metadata } from 'next';
import { ContactDetails } from '@/components/contact-details';
import { PageHeader } from '@/components/page-header';
import { ContactForm } from './contact-form';

export const metadata: Metadata = {
  title: 'تماس با ما',
  description: 'اطلاعات تماس و فرم ارسال پیام به مرکز توسعه کسب‌وکار اتاق بازرگانی یزد.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <>
      <PageHeader title="تماس با ما" crumbs={[{ title: 'تماس با ما' }]} />
      <div className="mx-auto grid max-w-(--container-page) gap-10 px-4 py-12 lg:grid-cols-[1fr_2fr]">
        <section aria-labelledby="contact-info-heading">
          <h2 id="contact-info-heading" className="mb-4 text-lg font-bold text-brand-900">
            اطلاعات تماس
          </h2>
          <ContactDetails className="space-y-2 text-sm leading-7 text-ink-2" />
        </section>
        <section
          aria-labelledby="contact-form-heading"
          className="rounded-panel border border-line bg-white p-6"
        >
          <h2 id="contact-form-heading" className="mb-4 text-lg font-bold text-brand-900">
            ارسال پیام
          </h2>
          <ContactForm />
        </section>
      </div>
    </>
  );
}
