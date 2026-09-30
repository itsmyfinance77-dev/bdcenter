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

export function ConsultingForm() {
  const [state, action] = useActionState(submitConsultingRequest, initialFormState);
  return (
    <form action={action} className="relative space-y-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="نام و نام خانوادگی" required {...fieldState(state, 'fullName')} />
        <TextField label="نام شرکت" {...fieldState(state, 'companyName')} />
        <TextField
          label="کد ملی / شناسه ملی شرکت"
          hint="برای شناسایی عضویت شما در اتاق بازرگانی"
          {...fieldState(state, 'nationalId')}
        />
        <TextField label="شماره تماس" type="tel" required {...fieldState(state, 'phone')} />
        <TextField label="ایمیل" type="email" {...fieldState(state, 'email')} />
        <TextField label="موضوع مشاوره" required {...fieldState(state, 'topic')} />
      </div>
      <TextareaField label="توضیحات" {...fieldState(state, 'description')} />
      <Honeypot />
      <SubmitButton>ثبت درخواست</SubmitButton>
    </form>
  );
}
