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
    <form action={action} className="relative grid gap-x-4 gap-y-[18px] sm:grid-cols-2" noValidate>
      {state.status === 'idle' ? null : (
        <div className="sm:col-span-2">
          <FormMessage state={state} />
        </div>
      )}
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
      <div className="sm:col-span-2">
        <TextareaField label="توضیحات" {...field('description')} />
      </div>
      <Honeypot />
      <div className="mt-1.5 sm:col-span-2">
        <SubmitButton>ثبت درخواست</SubmitButton>
      </div>
    </form>
  );
}
