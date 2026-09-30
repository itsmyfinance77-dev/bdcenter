'use client';

import { useActionState } from 'react';
import { fieldState, FormMessage, SubmitButton, TextField } from '@/components/form-controls';
import type { FormState } from '@/lib/form-state';
import { saveProfileAction } from './actions';

export function ProfileForm({ initial, next }: { initial: Record<string, string>; next?: string }) {
  const initialState: FormState = { status: 'error', message: '', errors: {}, values: initial };
  const [state, action] = useActionState(saveProfileAction, initialState);
  // After a successful save the page re-renders with the stored values.
  const field = (name: string) =>
    fieldState(state.status === 'success' ? initialState : state, name);

  return (
    <form action={action} className="space-y-4">
      {state.status === 'success' || (state.status === 'error' && state.message) ? (
        <FormMessage state={state} />
      ) : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TextField label="نام و نام خانوادگی" required autoComplete="name" {...field('fullName')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="کد ملی / شناسه ملی"
          hint="برای تشخیص عضویت در اتاق بازرگانی"
          {...field('nationalId')}
        />
        <TextField label="نام شرکت" autoComplete="organization" {...field('companyName')} />
      </div>
      <TextField label="ایمیل" type="email" autoComplete="email" {...field('email')} />
      <SubmitButton>ذخیره</SubmitButton>
    </form>
  );
}
