'use client';

import { useActionState } from 'react';
import {
  fieldState,
  FormMessage,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
} from '@/components/form-controls';
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
      <TextareaField
        label="متن"
        required
        rows={18}
        hint="قالب‌بندی: «## » تیتر، «- » فهرست، **پررنگ**، [متن پیوند](https://...)"
        {...field('body')}
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
