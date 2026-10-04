import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/site/icons';
import { PageBody } from '@/components/site/page-body';
import { formCopy } from '@/content/forms';
import { listPublishedForms } from '@/modules/forms/service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'فرم‌ها',
  description: 'فرم‌های درخواست خدمات مرکز توسعه کسب‌وکار اتاق بازرگانی یزد.',
  alternates: { canonical: '/forms' },
};

export default async function FormsPage() {
  const forms = await listPublishedForms();
  const now = new Date();
  return (
    <>
      <PageHeader title="فرم‌ها" crumbs={[{ title: 'فرم‌ها' }]} />
      <PageBody>
        {forms.length === 0 ? (
          <div className="flex flex-col items-center gap-3.5 rounded-3xl border-[1.5px] border-dashed border-line-strong bg-surface-2 px-6 py-[clamp(40px,6vw,72px)] text-center">
            <span className="grid size-[52px] place-items-center rounded-[14px] bg-surface-3 text-ink-3">
              <Icon name="clipboard" size={24} strokeWidth={1.7} />
            </span>
            <p className="text-[15px] text-ink-2">در حال حاضر فرم فعالی وجود ندارد.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-5">
            {forms.map((form) => (
              <li key={form.slug}>
                <Link
                  href={`/forms/${form.slug}`}
                  className="flex h-full flex-col gap-3.5 rounded-3xl border border-line bg-white p-7 text-ink transition-[transform,box-shadow,border-color] duration-350 ease-(--ease-out-soft) hover:-translate-y-1 hover:border-line-hover hover:text-ink hover:shadow-[0_24px_48px_-26px_rgba(11,34,87,.4)]"
                >
                  <span className="grid size-12 place-items-center rounded-[14px] bg-accent-tint text-accent-ink">
                    <Icon name="clipboard" size={24} strokeWidth={1.7} />
                  </span>
                  <h2 className="text-xl font-extrabold text-brand-900">{form.title}</h2>
                  {form.membersOnly || (form.closesAt && form.closesAt <= now) ? (
                    <span className="flex flex-wrap gap-2 text-xs">
                      {form.membersOnly ? (
                        <span className="rounded-chip bg-primary-tint px-2 py-0.5 text-primary">
                          {formCopy.membersBadge}
                        </span>
                      ) : null}
                      {form.closesAt && form.closesAt <= now ? (
                        <span className="rounded-chip bg-surface-2 px-2 py-0.5 text-ink-2">
                          {formCopy.closedBadge}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                  {form.description ? (
                    <p className="line-clamp-3 text-[15px] leading-[1.95] text-pretty text-ink-2">
                      {form.description}
                    </p>
                  ) : null}
                  <span className="mt-auto flex items-center gap-1.5 text-sm font-bold text-accent-ink">
                    تکمیل فرم
                    <Icon name="arrowStart" size={16} strokeWidth={2} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}
