'use client';

import Image from 'next/image';
import { useActionState, useState } from 'react';
import {
  Field,
  fieldState,
  FormMessage,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
} from '@/components/form-controls';
import { RichEditor } from '@/components/admin/rich-editor';
import { articleKindLabel, contentStatusLabel } from '@/content/admin';
import type { FormState } from '@/lib/form-state';
import { saveArticleAction } from './actions';

export type ArticleFormValues = Record<string, string>;

export function ArticleForm({
  id,
  initial,
  coverUrl = null,
}: {
  id: string | null;
  initial: ArticleFormValues;
  coverUrl?: string | null;
}) {
  const initialState: FormState = { status: 'error', message: '', errors: {}, values: initial };
  const [state, action] = useActionState(saveArticleAction.bind(null, id), initialState);
  const [kind, setKind] = useState(initial.kind ?? 'NEWS');
  const field = (name: string) => fieldState(state, name);

  return (
    <form action={action} className="space-y-4 rounded-panel border border-line bg-white p-6">
      {state.status === 'error' && state.message ? <FormMessage state={state} /> : null}
      {state.status === 'error' && state.errors._form ? (
        <p className="text-sm text-danger">{state.errors._form}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="نوع" options={articleKindLabel} onChange={setKind} {...field('kind')} />
        <SelectField label="وضعیت" options={contentStatusLabel} {...field('status')} />
      </div>
      <TextField label="عنوان" required {...field('title')} />
      <TextField
        label="نامک (آدرس صفحه)"
        hint="خالی بگذارید تا از روی عنوان ساخته شود."
        {...field('slug')}
      />
      <TextareaField label="خلاصه" rows={2} {...field('excerpt')} />
      <RichEditor
        key={state.status === 'error' ? state.values.bodyMarkdown : 'initial'}
        name="bodyMarkdown"
        label="متن"
        initialHtml={(state.status === 'error' ? state.values.bodyMarkdown : '') ?? ''}
        error={state.status === 'error' ? state.errors.bodyMarkdown : undefined}
      />
      <fieldset className="space-y-4 rounded-card border border-line p-4">
        <legend className="px-1 text-sm font-medium text-ink">عکس کاور</legend>
        {coverUrl ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative aspect-video w-48 overflow-hidden rounded-card bg-surface-2">
              <Image
                src={coverUrl}
                alt=""
                fill
                unoptimized
                sizes="12rem"
                className="object-contain"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="removeCover"
                defaultChecked={state.status === 'error' && state.values.removeCover === 'on'}
                className="size-4 accent-primary"
              />
              حذف عکس فعلی
            </label>
          </div>
        ) : null}
        <Field
          {...field('coverImage')}
          label={coverUrl ? 'عکس جدید' : 'عکس'}
          defaultValue={undefined}
          hint="JPG، PNG یا WebP تا ۱۰ مگابایت. اگر فرم خطا داد، عکس را دوباره انتخاب کنید."
        >
          {(control) => <input {...control} type="file" accept="image/jpeg,image/png,image/webp" />}
        </Field>
        <TextField
          label="توضیح عکس (برای نابینایان و موتورهای جستجو)"
          hint="خالی بگذارید تا عنوان مطلب استفاده شود."
          {...field('coverAlt')}
        />
      </fieldset>
      {kind === 'EVENT' ? (
        <fieldset className="grid gap-4 rounded-card border border-line p-4 sm:grid-cols-3">
          <legend className="px-1 text-sm font-medium text-ink">مشخصات رویداد</legend>
          <TextField label="زمان شروع" hint="مثلاً ۱۴۰۵/۰۷/۱۵ ۱۸:۳۰" {...field('eventStartsAt')} />
          <TextField label="زمان پایان" hint="اختیاری" {...field('eventEndsAt')} />
          <TextField label="مکان" {...field('eventLocation')} />
        </fieldset>
      ) : null}
      <SubmitButton>ذخیره</SubmitButton>
    </form>
  );
}
