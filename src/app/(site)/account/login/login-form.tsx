'use client';

import { useActionState } from 'react';
import { SubmitButton, TextField } from '@/components/form-controls';
import { toPersianDigits } from '@/lib/format';
import { memberLoginAction, type LoginState } from './actions';

export function MemberLoginForm({
  next,
  codeTtlSeconds,
}: {
  next?: string;
  codeTtlSeconds: number;
}) {
  const [state, action] = useActionState<LoginState, FormData>(memberLoginAction, {
    step: 'phone',
    phone: '',
  });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="step" value={state.step} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.error ? (
        <p
          role="alert"
          className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : state.message ? (
        <p
          role="status"
          className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
        >
          {state.message}
        </p>
      ) : null}

      {state.step === 'phone' ? (
        <>
          <TextField
            key="phone"
            name="phone"
            label="شماره همراه"
            type="tel"
            autoComplete="tel"
            required
            hint="مثلاً ۰۹۱۲۳۴۵۶۷۸۹"
            defaultValue={state.phone}
            error={state.errors?.phone}
          />
          <SubmitButton>دریافت کد</SubmitButton>
        </>
      ) : (
        <>
          <input type="hidden" name="phone" value={state.phone} />
          <p className="text-sm text-ink-2">
            کد ۶ رقمی به شماره <span dir="ltr">{toPersianDigits(state.phone)}</span> فرستاده شد و{' '}
            {toPersianDigits(String(codeTtlSeconds / 60))} دقیقه اعتبار دارد.
          </p>
          <TextField
            key="code"
            name="code"
            label="کد ورود"
            required
            autoComplete="one-time-code"
            error={state.errors?.code}
          />
          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton>ورود</SubmitButton>
            <button
              type="submit"
              name="resend"
              value="1"
              formNoValidate
              className="text-sm text-primary hover:underline"
            >
              ارسال دوباره کد
            </button>
          </div>
        </>
      )}
    </form>
  );
}
