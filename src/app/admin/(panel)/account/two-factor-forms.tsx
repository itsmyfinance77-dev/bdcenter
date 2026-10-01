'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { SubmitButton, TextField } from '@/components/form-controls';
import {
  confirmTwoFactorAction,
  disableTwoFactorAction,
  regenerateCodesAction,
  type TwoFactorState,
} from './two-factor-actions';

const idle: TwoFactorState = { status: 'idle' };

function ErrorLine({ state }: { state: TwoFactorState }) {
  return state.status === 'error' ? (
    <p role="status" className="text-sm font-semibold text-danger">
      {state.message}
    </p>
  ) : null;
}

/** Shown once: the admin must store these somewhere safe. */
function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="space-y-3 rounded-card border border-warning/30 bg-warning/10 p-4">
      <p className="text-sm font-semibold text-warning">
        کدهای بازیابی را همین حالا جایی امن (بیرون از گوشی) نگه دارید. هر کد یک بار کار می‌کند و
        دیگر نمایش داده نمی‌شود.
      </p>
      <ul dir="ltr" className="grid grid-cols-2 gap-2 font-mono text-sm">
        {codes.map((code) => (
          <li key={code} className="rounded-chip bg-white px-2 py-1 text-center">
            {code}
          </li>
        ))}
      </ul>
      <Link href="/admin/account" className="inline-block text-sm font-semibold text-primary">
        کدها را ذخیره کردم، ادامه
      </Link>
    </div>
  );
}

export function ConfirmSetupForm() {
  const [state, action] = useActionState(confirmTwoFactorAction, idle);
  if (state.status === 'codes') {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-success">ورود دومرحله‌ای فعال شد.</p>
        <RecoveryCodes codes={state.codes} />
      </div>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <ErrorLine state={state} />
      <TextField name="code" label="کد ۶ رقمی برنامه" autoComplete="one-time-code" required />
      <SubmitButton>تأیید و فعال‌سازی</SubmitButton>
    </form>
  );
}

export function RegenerateCodesForm() {
  const [state, action] = useActionState(regenerateCodesAction, idle);
  if (state.status === 'codes') return <RecoveryCodes codes={state.codes} />;
  return (
    <form action={action} className="space-y-3">
      <ErrorLine state={state} />
      <TextField name="code" label="کد فعلی برنامه" autoComplete="one-time-code" required />
      <SubmitButton>ساخت کدهای بازیابی تازه</SubmitButton>
    </form>
  );
}

export function DisableForm() {
  const [state, action] = useActionState(disableTwoFactorAction, idle);
  return (
    <form action={action} className="space-y-3">
      <ErrorLine state={state} />
      <TextField
        name="password"
        type="password"
        label="رمز عبور"
        autoComplete="current-password"
        required
      />
      <TextField
        name="code"
        label="کد برنامه یا کد بازیابی"
        autoComplete="one-time-code"
        required
      />
      <SubmitButton>غیرفعال کردن ورود دومرحله‌ای</SubmitButton>
    </form>
  );
}
