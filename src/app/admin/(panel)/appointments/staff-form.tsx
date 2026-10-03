'use client';

import Image from 'next/image';
import { useActionState } from 'react';
import {
  Field,
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

export function StaffForm({
  id,
  initial,
  photoUrl,
}: {
  id: string | null;
  initial: Record<string, string>;
  photoUrl: string | null;
}) {
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
          label="شماره همراه"
          type="tel"
          required
          hint="تاریخ و ساعت هر نوبتی که رزرو یا لغو شود به این شماره پیامک می‌شود."
          {...field('mobile')}
        />
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
      <fieldset className="space-y-3 rounded-card border border-line p-4">
        <legend className="px-1 text-sm font-medium text-ink">عکس</legend>
        {photoUrl ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative size-24 overflow-hidden rounded-full bg-surface-2">
              <Image src={photoUrl} alt="" fill unoptimized sizes="6rem" className="object-cover" />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="removePhoto"
                defaultChecked={state.status === 'error' && state.values.removePhoto === 'on'}
                className="size-4 accent-primary"
              />
              حذف عکس فعلی
            </label>
          </div>
        ) : null}
        <Field
          {...field('photo')}
          label={photoUrl ? 'عکس جدید' : 'عکس مشاور'}
          defaultValue={undefined}
          hint="JPG، PNG یا WebP تا ۱۰ مگابایت؛ بهتر است مربعی و از روبه‌رو باشد. اگر فرم خطا داد، عکس را دوباره انتخاب کنید."
        >
          {(control) => <input {...control} type="file" accept="image/jpeg,image/png,image/webp" />}
        </Field>
      </fieldset>
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
