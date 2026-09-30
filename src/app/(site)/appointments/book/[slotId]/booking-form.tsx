'use client';

import { useActionState } from 'react';
import {
  fieldState,
  FormMessage,
  SubmitButton,
  TextareaField,
  TextField,
} from '@/components/form-controls';
import { appointmentsCopy } from '@/content/appointments';
import { initialFormState } from '@/lib/form-state';
import { bookSlotAction } from './actions';

export function BookingForm({ slotId }: { slotId: string }) {
  const [state, action] = useActionState(bookSlotAction.bind(null, slotId), initialFormState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <TextField label="موضوع" required {...fieldState(state, 'topic')} />
      <TextareaField label="توضیحات" rows={4} {...fieldState(state, 'description')} />
      <SubmitButton>{appointmentsCopy.confirm}</SubmitButton>
    </form>
  );
}
