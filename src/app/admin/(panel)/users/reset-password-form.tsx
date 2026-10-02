'use client';

import { useActionState, useState } from 'react';
import { secondaryButtonClass } from '@/components/admin/ui';
import { resetPasswordAction, type ResetPasswordState } from './actions';

/**
 * «تعیین رمز تازه» for another user: type a password, or leave it empty and
 * get a generated one, shown once with a copy button.
 */
export function ResetPasswordForm({ userId, email }: { userId: string; email: string }) {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    resetPasswordAction.bind(null, userId),
    { status: 'idle' },
  );
  const [copied, setCopied] = useState(false);

  return (
    <details className="text-xs">
      <summary className="inline-block cursor-pointer py-1 text-primary hover:underline">
        تعیین رمز تازه
      </summary>
      <div className="mt-2 w-64 space-y-2 rounded-control border border-line bg-surface p-3">
        {state.status === 'success' ? (
          <div role="status" className="space-y-2">
            <p className="leading-6 text-success">{state.message}</p>
            {state.generated ? (
              <div className="flex items-center gap-2">
                <code
                  dir="ltr"
                  className="flex-1 rounded-chip border border-line bg-white px-2 py-1.5 text-center font-sans text-sm tracking-wide select-all"
                >
                  {state.generated}
                </code>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(state.generated!);
                      setCopied(true);
                    } catch {
                      // Clipboard blocked: the code is selectable.
                    }
                  }}
                >
                  {copied ? 'کپی شد' : 'کپی'}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <form action={action} className="space-y-2">
            <p className="leading-6 text-ink-2">
              خالی بگذارید تا رمزی قوی ساخته شود. کاربر از همهٔ دستگاه‌ها خارج می‌شود و پس از ورود
              باید رمز خودش را انتخاب کند.
            </p>
            <label className="block">
              <span className="sr-only">رمز تازهٔ {email}</span>
              <input
                type="text"
                name="password"
                dir="ltr"
                autoComplete="off"
                spellCheck={false}
                placeholder="خالی = ساخت خودکار"
                className="w-full rounded-control border border-line bg-white px-2 py-1.5 text-sm"
              />
            </label>
            {state.status === 'error' ? (
              <p role="alert" className="text-danger">
                {state.message}
              </p>
            ) : null}
            <button type="submit" disabled={pending} className={secondaryButtonClass}>
              {pending ? 'در حال ثبت…' : 'ثبت رمز تازه'}
            </button>
          </form>
        )}
      </div>
    </details>
  );
}
