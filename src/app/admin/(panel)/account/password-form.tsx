'use client';

import { useActionState } from 'react';
import { fieldState, FormMessage, SubmitButton, TextField } from '@/components/form-controls';
import { initialFormState } from '@/lib/form-state';
import { changePasswordAction } from './actions';

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialFormState);
  return (
    <form action={action} className="space-y-4 rounded-panel border border-line bg-white p-6">
      <FormMessage state={state} />
      <TextField
        label="رمز عبور فعلی"
        type="password"
        autoComplete="current-password"
        required
        name="current"
        error={state.status === 'error' ? state.errors.current : undefined}
      />
      <TextField
        label="رمز عبور جدید"
        type="password"
        autoComplete="new-password"
        required
        hint="حداقل ۱۲ کاراکتر"
        {...fieldState(state, 'next')}
        defaultValue={undefined}
      />
      <SubmitButton>تغییر رمز</SubmitButton>
    </form>
  );
}
