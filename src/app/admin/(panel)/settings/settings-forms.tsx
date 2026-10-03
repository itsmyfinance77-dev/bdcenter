'use client';

import { useActionState } from 'react';
import {
  fieldState,
  FormMessage,
  SubmitButton,
  TextareaField,
  TextField,
} from '@/components/form-controls';
import { alertKindLabel } from '@/content/admin';
import type { FormState } from '@/lib/form-state';
import { saveAlertsAction, saveContactAction } from './actions';

function useForm(
  action: (prev: FormState, data: FormData) => Promise<FormState>,
  initial: Record<string, string>,
) {
  const initialState: FormState = { status: 'error', message: '', errors: {}, values: initial };
  const [state, formAction] = useActionState(action, initialState);
  // After a successful save the page re-renders with the stored values.
  const shown = state.status === 'success' ? initialState : state;
  return { state, formAction, field: (name: string) => fieldState(shown, name) };
}

function Message({ state }: { state: FormState }) {
  return state.status === 'success' || (state.status === 'error' && state.message) ? (
    <FormMessage state={state} />
  ) : null;
}

export function ContactSettingsForm({ initial }: { initial: Record<string, string> }) {
  const { state, formAction, field } = useForm(saveContactAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <Message state={state} />
      <TextField label="نشانی" required {...field('address')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="تلفن" required hint="مثلاً ۰۳۵-۹۱۰۹۱۰۵۰" {...field('phone')} />
        <TextField label="داخلی" hint="اختیاری" {...field('phoneExtension')} />
        <TextField label="ایمیل" type="email" hint="اختیاری" {...field('email')} />
        <TextField label="کد پستی" hint="اختیاری" {...field('postalCode')} />
      </div>
      <SubmitButton>ذخیرهٔ اطلاعات تماس</SubmitButton>
    </form>
  );
}

export function AlertSettingsForm({ initial }: { initial: Record<string, string> }) {
  const { state, formAction, field } = useForm(saveAlertsAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <Message state={state} />
      {(Object.keys(alertKindLabel) as (keyof typeof alertKindLabel)[]).map((kind) => (
        <TextareaField
          key={kind}
          label={alertKindLabel[kind]}
          rows={2}
          hint="شمارهٔ همراه یا ایمیل کسانی که باید خبردار شوند؛ هر کدام در یک خط. خالی یعنی به کسی خبر داده نمی‌شود."
          {...field(kind)}
        />
      ))}
      <SubmitButton>ذخیرهٔ گیرندگان</SubmitButton>
    </form>
  );
}
