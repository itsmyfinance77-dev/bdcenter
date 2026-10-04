import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { AdminHeading, secondaryButtonClass } from '@/components/admin/ui';
import { ConfirmButton } from '@/components/admin/confirm-button';
import { toPersianDigits } from '@/lib/format';
import { formatJalaliInput } from '@/lib/jalali';
import { editorHtml } from '@/lib/rich-html';
import { requireAdmin } from '@/modules/auth/service';
import { readSettings } from '@/modules/forms/fields';
import { getFormForAdmin } from '@/modules/forms/service';
import { duplicateFormAction } from '../../actions';
import { FormBuilder } from '../../form-builder';

export const metadata = { title: 'ویرایش فرم' };

const optionsSchema = z.array(z.string());
const recipientsSchema = z.object({ phones: z.array(z.string()), emails: z.array(z.string()) });

/** Stored per-form recipients as the textarea shows them: one per line. */
function recipientsText(value: unknown): string {
  const recipients = recipientsSchema.safeParse(value).data;
  return recipients ? [...recipients.phones, ...recipients.emails].join('\n') : '';
}

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
        <ConfirmButton
          action={duplicateFormAction.bind(null, form.id)}
          message="از این فرم یک کپی پیش‌نویس ساخته شود؟"
          className={secondaryButtonClass}
        >
          کپی فرم
        </ConfirmButton>
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
          opensAt: form.opensAt ? toPersianDigits(formatJalaliInput(form.opensAt)) : '',
          closesAt: form.closesAt ? toPersianDigits(formatJalaliInput(form.closesAt)) : '',
          maxSubmissions:
            form.maxSubmissions === null ? '' : toPersianDigits(String(form.maxSubmissions)),
          membersOnly: form.membersOnly ? 'on' : '',
          onePerMember: form.onePerMember ? 'on' : '',
          confirmToApplicant: form.confirmToApplicant ? 'on' : '',
          thankYouText: form.thankYouText ?? '',
          alertRecipients: recipientsText(form.alertRecipients),
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
