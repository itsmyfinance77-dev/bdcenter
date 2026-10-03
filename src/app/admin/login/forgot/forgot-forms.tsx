'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { fieldState, FormMessage, SubmitButton, TextField } from '@/components/form-controls';
import { initialFormState } from '@/lib/form-state';
import { forgotAction, resetAction } from './actions';

export function ForgotForm() {
  const [state, action] = useActionState(forgotAction, initialFormState);
  if (state.status === 'success') {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <Link href="/admin/login" className="text-sm text-primary hover:underline">
          بازگشت به صفحهٔ ورود
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <TextField
        label="ایمیل حساب پنل"
        type="email"
        autoComplete="username"
        required
        {...fieldState(state, 'email')}
      />
      <SubmitButton>فرستادن پیوند</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetAction, initialFormState);
  if (state.status === 'success') {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <Link href="/admin/login" className="text-sm font-semibold text-primary hover:underline">
          ورود به پنل
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <TextField
        label="رمز تازه"
        type="password"
        autoComplete="new-password"
        required
        hint="حداقل ۱۲ کاراکتر"
        {...fieldState(state, 'password')}
      />
      <TextField
        label="تکرار رمز تازه"
        type="password"
        autoComplete="new-password"
        required
        {...fieldState(state, 'confirm')}
      />
      <SubmitButton>ثبت رمز تازه</SubmitButton>
    </form>
  );
}
