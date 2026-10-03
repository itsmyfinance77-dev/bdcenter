'use client';

import { useActionState } from 'react';
import { RichEditor } from '@/components/admin/rich-editor';
import { fieldState, FormMessage, SubmitButton, TextField } from '@/components/form-controls';
import type { FormState } from '@/lib/form-state';
import { saveServiceAction } from './actions';

export function ServiceForm({
  slug,
  fixed,
  initial,
}: {
  slug: string;
  /** Training, consulting and the service desk are always live. */
  fixed: boolean;
  initial: Record<string, string>;
}) {
  const initialState: FormState = { status: 'error', message: '', errors: {}, values: initial };
  const [state, action] = useActionState(saveServiceAction.bind(null, slug), initialState);
  const shown = state.status === 'success' ? initialState : state;
  const field = (name: string) => fieldState(shown, name);
  const values = shown.status === 'error' ? shown.values : initial;

  return (
    <form action={action} className="space-y-4 rounded-panel border border-line bg-white p-6">
      {state.status === 'success' || (state.status === 'error' && state.message) ? (
        <FormMessage state={state} />
      ) : null}
      <TextField label="عنوان" required {...field('title')} />
      <TextField
        label="توضیح کوتاه"
        hint="یک جملهٔ کوتاه که روی کاشی صفحهٔ اصلی و زیر عنوان نمایش داده می‌شود."
        {...field('summary')}
      />
      {fixed ? null : (
        <label className="flex items-start gap-2 text-sm leading-7 text-ink">
          <input
            key={values.isPlaceholder}
            type="checkbox"
            name="isPlaceholder"
            defaultChecked={values.isPlaceholder === 'on'}
            className="mt-1.5 size-4 accent-primary"
          />
          <span>
            «به‌زودی»: این خدمت هنوز راه نیفتاده است. کاشی آن خاکستری نمایش داده می‌شود و صفحه‌اش
            فقط پیام «به‌زودی اضافه می‌شود» را دارد. برای راه‌اندازی، تیک را بردارید.
          </span>
        </label>
      )}
      <RichEditor
        key={state.status === 'error' ? state.values.body : 'initial'}
        name="body"
        label="متن صفحهٔ این خدمت"
        required={false}
        hint={
          fixed
            ? 'بالای صفحهٔ این خدمت، پیش از فرم یا پیوند آن نمایش داده می‌شود.'
            : 'وقتی خدمت فعال باشد، در صفحهٔ آن نمایش داده می‌شود.'
        }
        initialHtml={(state.status === 'error' ? state.values.body : '') ?? ''}
        error={state.status === 'error' ? state.errors.body : undefined}
      />
      <SubmitButton>ذخیره</SubmitButton>
    </form>
  );
}
