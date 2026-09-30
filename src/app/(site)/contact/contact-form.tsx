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
    <form action={action} className="relative space-y-4" noValidate>
      <FormMessage state={state} />
      <TextField label="نام و نام خانوادگی" required {...fieldState(state, 'fullName')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="شماره تماس" type="tel" {...fieldState(state, 'phone')} />
        <TextField label="ایمیل" type="email" {...fieldState(state, 'email')} />
      </div>
      <TextareaField label="متن پیام" required {...fieldState(state, 'message')} />
      <Honeypot />
      <SubmitButton>ارسال پیام</SubmitButton>
    </form>
  );
}
