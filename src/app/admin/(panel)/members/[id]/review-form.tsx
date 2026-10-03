'use client';

import { useActionState, useState } from 'react';
import { FormMessage, SubmitButton, TextareaField, fieldState } from '@/components/form-controls';
import { actionResultKey, type FormState } from '@/lib/form-state';
import { reviewMemberAction } from '../actions';

/** Approve or reject a legal-entity representative; a rejection needs a reason. */
export function ReviewForm({ memberId }: { memberId: string }) {
  const initialState: FormState = { status: 'error', message: '', errors: {}, values: {} };
  const [state, action] = useActionState(reviewMemberAction.bind(null, memberId), initialState);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');

  return (
    <form action={action} className="space-y-4">
      {state.status === 'success' || (state.status === 'error' && state.message) ? (
        <FormMessage state={state} />
      ) : null}
      <div className="flex flex-wrap gap-3">
        {(
          [
            ['APPROVED', 'تأیید'],
            ['REJECTED', 'رد'],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-control border-[1.5px] px-4 text-sm ${
              decision === value ? 'border-primary bg-primary/5 text-primary' : 'border-line'
            }`}
          >
            <input
              type="radio"
              name="decision"
              value={value}
              key={`${value}-${actionResultKey(state)}`}
              defaultChecked={decision === value}
              onChange={() => setDecision(value)}
              className="size-4 accent-primary"
            />
            {label}
          </label>
        ))}
      </div>
      {decision === 'REJECTED' ? (
        <TextareaField
          label="دلیل رد (به عضو نشان داده می‌شود)"
          required
          rows={3}
          {...fieldState(state, 'note')}
        />
      ) : null}
      <SubmitButton>ثبت نتیجه و ارسال پیامک به عضو</SubmitButton>
    </form>
  );
}
