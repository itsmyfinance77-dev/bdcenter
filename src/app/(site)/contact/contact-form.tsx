'use client';

import { useActionState } from 'react';
import {
  fieldState,
  FormMessage,
  Honeypot,
  SubmitButton,
  TextareaField,
  TextField,
} from '@/components/form-controls';
import { initialFormState } from '@/lib/form-state';
import { sendContactMessage } from './actions';

export function ContactForm() {
  const [state, action] = useActionState(sendContactMessage, initialFormState);
  return (
    <form action={action} className="relative grid gap-x-4 gap-y-[18px] sm:grid-cols-2" noValidate>
      {state.status === 'idle' ? null : (
        <div className="sm:col-span-2">
          <FormMessage state={state} />
        </div>
      )}
      <div className="sm:col-span-2">
        <TextField label="نام و نام خانوادگی" required {...fieldState(state, 'fullName')} />
      </div>
      <TextField label="شماره تماس" type="tel" {...fieldState(state, 'phone')} />
      <TextField label="ایمیل" type="email" {...fieldState(state, 'email')} />
      <div className="sm:col-span-2">
        <TextareaField label="متن پیام" required {...fieldState(state, 'message')} />
      </div>
      <Honeypot />
      <div className="mt-1.5 sm:col-span-2">
        <SubmitButton>ارسال پیام</SubmitButton>
      </div>
    </form>
  );
}
