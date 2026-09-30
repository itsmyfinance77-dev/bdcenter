'use client';

import { useActionState } from 'react';
import {
  fieldState,
  FormMessage,
  SelectField,
  SubmitButton,
  TextField,
} from '@/components/form-controls';
import { adminRoleLabel } from '@/content/admin';
import { initialFormState } from '@/lib/form-state';
import { createAdminAction } from './actions';

export function NewUserForm() {
  const [state, action] = useActionState(createAdminAction, initialFormState);
  return (
    <form action={action} className="space-y-4 rounded-panel border border-line bg-white p-6">
      <h2 className="font-semibold text-ink">افزودن کاربر</h2>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="نام و نام خانوادگی" required {...fieldState(state, 'fullName')} />
        <TextField label="ایمیل" type="email" required {...fieldState(state, 'email')} />
        <SelectField
          label="نقش"
          options={{ EDITOR: adminRoleLabel.EDITOR, ADMIN: adminRoleLabel.ADMIN }}
          {...fieldState(state, 'role')}
        />
        <TextField
          label="رمز عبور اولیه"
          type="password"
          autoComplete="new-password"
          required
          hint="حداقل ۱۲ کاراکتر؛ کاربر پس از ورود آن را تغییر دهد."
          {...fieldState(state, 'password')}
        />
      </div>
      <SubmitButton>ساخت حساب</SubmitButton>
    </form>
  );
}
