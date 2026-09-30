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
import { serviceLabel } from '@/content/appointments';
import type { FormState } from '@/lib/form-state';
import { saveStaffAction } from './actions';

export function StaffForm({ id, initial }: { id: string | null; initial: Record<string, string> }) {
  const initialState: FormState = { status: 'error', message: '', errors: {}, values: initial };
  const [state, action] = useActionState(saveStaffAction.bind(null, id), initialState);
  const field = (name: string) => fieldState(state, name);
  const isActive = state.status === 'error' ? state.values.isActive === 'on' : true;

  return (
    <form action={action} className="space-y-4 rounded-panel border border-line bg-white p-6">
      {state.status === 'error' && state.message ? <FormMessage state={state} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="بخش" options={serviceLabel} {...field('service')} />
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
          <input
            key={String(isActive)}
            type="checkbox"
            name="isActive"
            defaultChecked={isActive}
            className="size-4 accent-primary"
          />
          فعال (در سایت نمایش داده شود)
        </label>
        <TextField label="نام و نام خانوادگی" required {...field('fullName')} />
        <TextField label="سمت یا تخصص" hint="مثلاً «مشاور بازاریابی»" {...field('title')} />
        <TextField
          label="ایمیل برای اطلاع از رزروها"
          type="email"
          hint="اختیاری؛ با هر رزرو جدید ایمیل می‌گیرد."
          {...field('email')}
        />
        <TextField
          label="ترتیب نمایش"
          type="number"
          hint="عدد کوچک‌تر بالاتر"
          {...field('sortOrder')}
        />
      </div>
      <TextareaField
        label="معرفی"
        rows={6}
        hint="قالب‌بندی مثل متن اخبار: «- » فهرست، **پررنگ**"
        {...field('bio')}
      />
      <SubmitButton>ذخیره</SubmitButton>
    </form>
  );
}
