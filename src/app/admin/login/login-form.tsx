'use client';

import { useActionState } from 'react';
import { fieldState, FormMessage, SubmitButton, TextField } from '@/components/form-controls';
import { initialFormState } from '@/lib/form-state';
import { loginAction } from './actions';

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, initialFormState);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <TextField
        label="ایمیل"
        type="email"
        autoComplete="username"
        required
        {...fieldState(state, 'email')}
      />
      <TextField
        label="رمز عبور"
        type="password"
        autoComplete="current-password"
        required
        name="password"
      />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <SubmitButton>ورود</SubmitButton>
    </form>
  );
}
