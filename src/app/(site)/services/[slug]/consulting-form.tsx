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
import { submitConsultingRequest } from './actions';

/** `prefill` comes from a signed-in member's profile; it only fills empty fields. */
export function ConsultingForm({ prefill = {} }: { prefill?: Record<string, string> }) {
  const [state, action] = useActionState(submitConsultingRequest, initialFormState);
  const field = (name: string) => {
    const current = fieldState(state, name);
    return { ...current, defaultValue: current.defaultValue ?? prefill[name] };
  };
  return (
    <form action={action} className="relative space-y-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="نام و نام خانوادگی" required {...field('fullName')} />
        <TextField label="نام شرکت" {...field('companyName')} />
        <TextField
          label="کد ملی / شناسه ملی شرکت"
          hint="برای شناسایی عضویت شما در اتاق بازرگانی"
          {...field('nationalId')}
        />
        <TextField label="شماره تماس" type="tel" required {...field('phone')} />
        <TextField label="ایمیل" type="email" {...field('email')} />
        <TextField label="موضوع مشاوره" required {...field('topic')} />
      </div>
      <TextareaField label="توضیحات" {...field('description')} />
      <Honeypot />
      <SubmitButton>ثبت درخواست</SubmitButton>
    </form>
  );
}
