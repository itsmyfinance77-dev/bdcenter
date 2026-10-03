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
import { alertKindLabel, menuIconLabel } from '@/content/admin';
import type { FormState } from '@/lib/form-state';
import { saveAlertsAction, saveContactAction, saveMenuAction, saveStatsAction } from './actions';

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

export function StatsSettingsForm({ initial }: { initial: Record<string, string> }) {
  const { state, formAction, field } = useForm(saveStatsAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <Message state={state} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <TextField
            label={`عنوان ${['اول', 'دوم', 'سوم', 'چهارم'][i]}`}
            hint={i === 0 ? 'مثلاً «شرکت آموزش‌دیده»' : undefined}
            {...field(`label${i}`)}
          />
          <TextField
            label="عدد"
            hint={i === 0 ? 'مثلاً «۱۲۰+»' : undefined}
            {...field(`value${i}`)}
          />
        </div>
      ))}
      <SubmitButton>ذخیرهٔ اعداد</SubmitButton>
    </form>
  );
}

export function MenuSettingsForm({
  initial,
  serviceRows,
  mainRows,
}: {
  initial: Record<string, string>;
  serviceRows: number;
  mainRows: number;
}) {
  const { state, formAction, field } = useForm(saveMenuAction, initial);
  const row = (prefix: string, i: number, withIcon: boolean) => (
    <div
      key={`${prefix}${i}`}
      className={`grid gap-3 ${withIcon ? 'sm:grid-cols-[1fr_1fr_160px]' : 'sm:grid-cols-2'}`}
    >
      <TextField
        label={`عنوان ${new Intl.NumberFormat('fa-IR').format(i + 1)}`}
        {...field(`${prefix}${i}title`)}
      />
      <TextField
        label="نشانی"
        hint={i === 0 ? 'مثلاً /courses یا https://...' : undefined}
        {...field(`${prefix}${i}href`)}
      />
      {withIcon ? (
        <SelectField label="نماد" options={menuIconLabel} {...field(`${prefix}${i}icon`)} />
      ) : null}
    </div>
  );
  return (
    <form action={formAction} className="space-y-6">
      <Message state={state} />
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold text-ink">زیرمنوی «خدمات»</legend>
        {Array.from({ length: serviceRows }, (_, i) => row('s', i, true))}
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold text-ink">پیوندهای کنار «خدمات»</legend>
        {Array.from({ length: mainRows }, (_, i) => row('m', i, false))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>ذخیرهٔ منو</SubmitButton>
        <button
          type="submit"
          name="reset"
          value="1"
          onClick={(event) => {
            if (!window.confirm('منوی پیش‌فرض سایت برگردانده شود؟')) event.preventDefault();
          }}
          className="text-sm text-danger hover:underline"
        >
          برگرداندن منوی پیش‌فرض
        </button>
      </div>
    </form>
  );
}
