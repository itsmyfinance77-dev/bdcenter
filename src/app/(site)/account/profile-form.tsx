'use client';

import { useActionState, useState } from 'react';
import {
  Field,
  fieldState,
  FormMessage,
  SubmitButton,
  TextField,
} from '@/components/form-controls';
import { personTypeLabel } from '@/content/members';
import { actionResultKey, type FormState } from '@/lib/form-state';
import { saveProfileAction } from './actions';

type PersonType = keyof typeof personTypeLabel;

export function ProfileForm({
  initial,
  next,
  hasLetter,
  hasNationalCard,
  nationalCardRequired,
}: {
  initial: Record<string, string>;
  next?: string;
  hasLetter: boolean;
  hasNationalCard: boolean;
  nationalCardRequired: boolean;
}) {
  const initialState: FormState = { status: 'error', message: '', errors: {}, values: initial };
  const [state, action] = useActionState(saveProfileAction, initialState);
  // After a successful save the page re-renders with the stored values.
  const shown = state.status === 'success' ? initialState : state;
  const field = (name: string) => fieldState(shown, name);
  const [personType, setPersonType] = useState<PersonType | ''>(
    (initial.personType as PersonType | undefined) ?? '',
  );
  const personTypeError = shown.status === 'error' ? shown.errors.personType : undefined;

  return (
    <form action={action} className="space-y-4">
      {state.status === 'success' || (state.status === 'error' && state.message) ? (
        <FormMessage state={state} />
      ) : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink">
          ثبت‌نام به‌عنوان
          <span aria-hidden="true" className="text-danger">
            {' '}
            *
          </span>
        </legend>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(personTypeLabel) as PersonType[]).map((type) => (
            <label
              key={type}
              className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-control border-[1.5px] px-4 text-sm ${
                personType === type ? 'border-primary bg-primary/5 text-primary' : 'border-line'
              }`}
            >
              <input
                type="radio"
                name="personType"
                value={type}
                // Uncontrolled and remounted per result: React resets the form
                // after each action, which would otherwise clear the choice.
                key={`${type}-${actionResultKey(state)}`}
                defaultChecked={personType === type}
                onChange={() => setPersonType(type)}
                className="size-4 accent-primary"
              />
              {personTypeLabel[type]}
            </label>
          ))}
        </div>
        {personTypeError ? (
          <p className="text-[13px] font-semibold text-danger">{personTypeError}</p>
        ) : null}
      </fieldset>

      <TextField label="نام و نام خانوادگی" required autoComplete="name" {...field('fullName')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="کد ملی" required hint="کد ملی ۱۰ رقمی خودتان" {...field('nationalId')} />
        <TextField
          label="کد پستی"
          required
          hint="۱۰ رقم، بدون خط تیره"
          autoComplete="postal-code"
          {...field('postalCode')}
        />
      </div>

      {personType === 'LEGAL' ? (
        <fieldset className="space-y-4 rounded-card border border-line p-4">
          <legend className="px-1 text-sm font-semibold text-ink">مشخصات شخص حقوقی</legend>
          <p className="text-[12.5px] leading-[1.8] text-ink-2">
            چند نفر می‌توانند از طرف یک شخص حقوقی ثبت‌نام کنند. حساب شما پس از بررسی معرفی‌نامه توسط
            مدیر سایت تأیید می‌شود.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="نام شخص حقوقی"
              required
              autoComplete="organization"
              {...field('companyName')}
            />
            <TextField
              label="شناسه ملی شخص حقوقی"
              required
              hint="۱۱ رقم"
              {...field('legalNationalId')}
            />
          </div>
          <Field
            {...field('letter')}
            label="تصویر معرفی‌نامه با سربرگ شرکت"
            required={!hasLetter}
            defaultValue={undefined}
            hint={`JPG، PNG یا PDF تا ۵ مگابایت.${hasLetter ? ' معرفی‌نامهٔ قبلی ثبت شده است؛ فقط برای عوض کردن آن فایل انتخاب کنید.' : ''}`}
          >
            {(control) => (
              <input {...control} type="file" accept="image/jpeg,image/png,application/pdf" />
            )}
          </Field>
        </fieldset>
      ) : null}

      <Field
        {...field('nationalCard')}
        label="تصویر کارت ملی"
        required={nationalCardRequired && !hasNationalCard}
        defaultValue={undefined}
        hint={`JPG یا PNG تا ۵ مگابایت.${nationalCardRequired ? '' : ' اختیاری.'}${hasNationalCard ? ' تصویر قبلی ثبت شده است؛ فقط برای عوض کردن آن فایل انتخاب کنید.' : ''}`}
      >
        {(control) => <input {...control} type="file" accept="image/jpeg,image/png" />}
      </Field>

      <TextField label="ایمیل" type="email" autoComplete="email" {...field('email')} />
      <p className="text-[12.5px] leading-[1.8] text-ink-2">
        اگر فرم خطا داد، فایل‌ها را دوباره انتخاب کنید.
      </p>
      <SubmitButton>ذخیره</SubmitButton>
    </form>
  );
}
