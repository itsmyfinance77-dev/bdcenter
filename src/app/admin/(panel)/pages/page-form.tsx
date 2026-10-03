'use client';

import { useActionState } from 'react';
import {
  fieldState,
  FormMessage,
  SelectField,
  SubmitButton,
  TextField,
} from '@/components/form-controls';
import { RichEditor } from '@/components/admin/rich-editor';
import { contentStatusLabel } from '@/content/admin';
import type { FormState } from '@/lib/form-state';
import { savePageAction } from './actions';

export function PageForm({
  slug,
  isSystem,
  initial,
}: {
  slug: string | null;
  isSystem: boolean;
  initial: Record<string, string>;
}) {
  const initialState: FormState = { status: 'error', message: '', errors: {}, values: initial };
  const [state, action] = useActionState(savePageAction.bind(null, slug), initialState);
  const field = (name: string) => fieldState(state, name);

  return (
    <form action={action} className="space-y-4 rounded-panel border border-line bg-white p-6">
      {state.status === 'error' && state.message ? <FormMessage state={state} /> : null}
      {state.status === 'error' && state.errors._form ? (
        <p className="text-sm text-danger">{state.errors._form}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="وضعیت" options={contentStatusLabel} {...field('status')} />
        {isSystem ? null : (
          <TextField
            label="نامک (آدرس صفحه)"
            hint="خالی بگذارید تا از روی عنوان ساخته شود. آدرس صفحه: /pages/نامک"
            {...field('slug')}
          />
        )}
      </div>
      <TextField label="عنوان" required {...field('title')} />
      <RichEditor
        // A failed save re-renders with the posted HTML, so nothing typed is lost.
        key={state.status === 'error' ? state.values.body : 'initial'}
        name="body"
        label="متن"
        initialHtml={(state.status === 'error' ? state.values.body : initial.body) ?? ''}
        error={state.status === 'error' ? state.errors.body : undefined}
        uploadUrl="/admin/pages/images"
      />
      <TextField
        label="توضیح کوتاه برای موتورهای جستجو"
        hint="اختیاری؛ اگر خالی بماند، ابتدای متن استفاده می‌شود."
        {...field('seoDesc')}
      />
      <SubmitButton>ذخیره</SubmitButton>
    </form>
  );
}
