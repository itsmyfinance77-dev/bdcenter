import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { listPublishedForms } from '@/modules/forms/service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'فرم‌ها',
  description: 'فرم‌های درخواست خدمات مرکز توسعه کسب‌وکار اتاق بازرگانی یزد.',
  alternates: { canonical: '/forms' },
};

export default async function FormsPage() {
  const forms = await listPublishedForms();
  return (
    <>
      <PageHeader title="فرم‌ها" crumbs={[{ title: 'فرم‌ها' }]} />
      <div className="mx-auto max-w-(--container-page) px-4 py-12">
        {forms.length === 0 ? (
          <p className="text-sm text-ink-2">در حال حاضر فرم فعالی وجود ندارد.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <li key={form.slug}>
                <Link
                  href={`/forms/${form.slug}`}
                  className="block h-full rounded-card border border-line bg-white p-5 transition hover:border-line-hover hover:shadow-sm"
                >
                  <h2 className="font-semibold text-ink">{form.title}</h2>
                  {form.description ? (
                    <p className="mt-2 text-sm leading-6 text-ink-2">{form.description}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
