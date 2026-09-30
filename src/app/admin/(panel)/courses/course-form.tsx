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
import { saveCourseAction } from './actions';

export function CourseForm({
  id,
  initial,
}: {
  id: string | null;
  initial: Record<string, string>;
}) {
  const initialState: FormState = { status: 'error', message: '', errors: {}, values: initial };
  const [state, action] = useActionState(saveCourseAction.bind(null, id), initialState);
  const field = (name: string) => fieldState(state, name);
  const enrollmentOpen = state.status === 'error' ? state.values.enrollmentOpen === 'on' : true;

  return (
    <form action={action} className="space-y-4 rounded-panel border border-line bg-white p-6">
      {state.status === 'error' && state.message ? <FormMessage state={state} /> : null}
      {state.status === 'error' && state.errors._form ? (
        <p className="text-sm text-danger">{state.errors._form}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="وضعیت" options={contentStatusLabel} {...field('status')} />
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
          <input
            key={String(enrollmentOpen)}
            type="checkbox"
            name="enrollmentOpen"
            defaultChecked={enrollmentOpen}
            className="size-4 accent-primary"
          />
          ثبت‌نام باز است
        </label>
      </div>
      <TextField label="عنوان" required {...field('title')} />
      <TextField
        label="نامک (آدرس صفحه)"
        hint="خالی بگذارید تا از روی عنوان ساخته شود."
        {...field('slug')}
      />
      <TextareaField
        label="توضیحات"
        rows={10}
        hint="قالب‌بندی مثل متن اخبار: «## » تیتر، «- » فهرست، **پررنگ**، [متن پیوند](https://...)"
        {...field('description')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="مدرس" {...field('instructor')} />
        <TextField label="مکان" {...field('location')} />
        <TextField label="زمان شروع" hint="مثلاً ۱۴۰۵/۰۸/۰۱ ۱۶:۰۰" {...field('startsAt')} />
        <TextField label="زمان پایان" hint="اختیاری" {...field('endsAt')} />
        <TextField
          label="ظرفیت"
          type="number"
          hint="خالی یعنی بدون محدودیت"
          {...field('capacity')}
        />
      </div>
      <SubmitButton>ذخیره</SubmitButton>
    </form>
  );
}
