import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { FormCard, PageBody } from '@/components/site/page-body';
import { ACCEPTED_UPLOAD_EXTENSIONS } from '@/modules/files/service';
import { getPublishedForm } from '@/modules/forms/service';
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

  return (
    <>
      <PageHeader
        title={form.title}
        lead={form.description ?? undefined}
        crumbs={[{ title: 'فرم‌ها', href: '/forms' }, { title: form.title }]}
      />
      <PageBody narrow>
        <FormCard id="form-heading" title={form.title}>
          <DynamicForm form={form} acceptedExtensions={ACCEPTED_UPLOAD_EXTENSIONS} />
        </FormCard>
      </PageBody>
    </>
  );
}
