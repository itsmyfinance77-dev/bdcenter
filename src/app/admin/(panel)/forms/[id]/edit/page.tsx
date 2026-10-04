import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { AdminHeading, secondaryButtonClass } from '@/components/admin/ui';
import { editorHtml } from '@/lib/rich-html';
import { requireAdmin } from '@/modules/auth/service';
import { readSettings } from '@/modules/forms/fields';
import { getFormForAdmin } from '@/modules/forms/service';
import { FormBuilder } from '../../form-builder';

export const metadata = { title: 'ویرایش فرم' };

const optionsSchema = z.array(z.string());

export default async function EditFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin('ADMIN');
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const form = await getFormForAdmin(id);
  if (!form) notFound();

  return (
    <>
      <AdminHeading title={`ویرایش فرم: ${form.title}`}>
        <Link href={`/admin/forms/${form.id}`} className={secondaryButtonClass}>
          درخواست‌های این فرم
        </Link>
        {form.status === 'PUBLISHED' ? (
          <Link href={`/forms/${form.slug}`} target="_blank" className={secondaryButtonClass}>
            مشاهده در سایت
          </Link>
        ) : null}
      </AdminHeading>
      {saved ? (
        <p
          role="status"
          className="mb-4 rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
        >
          ذخیره شد.
        </p>
      ) : null}
      <FormBuilder
        key={form.updatedAt.toISOString()}
        id={form.id}
        initial={{
          title: form.title,
          slug: form.slug,
          description: editorHtml(form.descriptionHtml, form.description),
          status: form.status,
        }}
        initialFields={form.fields.map((field) => ({
          key: field.key,
          label: field.label,
          type: field.type,
          isRequired: field.isRequired,
          options: optionsSchema.safeParse(field.options).data ?? [],
          settings: readSettings(field.settings),
        }))}
      />
    </>
  );
}
