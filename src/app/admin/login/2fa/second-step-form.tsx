'use client';

import { useActionState } from 'react';
import { fieldState, FormMessage, SubmitButton, TextField } from '@/components/form-controls';
import { initialFormState } from '@/lib/form-state';
import { secondStepAction } from '../actions';

export function SecondStepForm({ next }: { next?: string }) {
  const [state, action] = useActionState(secondStepAction, initialFormState);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <TextField
        label="کد تأیید یا کد بازیابی"
        autoComplete="one-time-code"
        required
        {...fieldState(state, 'code')}
      />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <SubmitButton>تأیید و ورود</SubmitButton>
    </form>
  );
}
