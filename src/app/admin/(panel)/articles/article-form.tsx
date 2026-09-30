'use client';

import { useActionState, useState } from 'react';
import {
  fieldState,
  FormMessage,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
} from '@/components/form-controls';
import { articleKindLabel, contentStatusLabel } from '@/content/admin';
import type { FormState } from '@/lib/form-state';
import { saveArticleAction } from './actions';

export type ArticleFormValues = Record<string, string>;

export function ArticleForm({ id, initial }: { id: string | null; initial: ArticleFormValues }) {
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
      <TextareaField
        label="متن"
        required
        rows={14}
        hint="پاراگراف‌ها را با یک خط خالی از هم جدا کنید."
        {...field('bodyMarkdown')}
      />
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
