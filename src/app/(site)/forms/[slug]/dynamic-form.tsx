'use client';

import { useActionState } from 'react';
import {
  Field,
  fieldState,
  FormMessage,
  Honeypot,
  SubmitButton,
  TextareaField,
  TextField,
} from '@/components/form-controls';
import { initialFormState } from '@/lib/form-state';
import type { PublicForm, PublicFormField } from '@/modules/forms/service';
import { submitDynamicForm } from './actions';

const inputTypes = {
  TEXT: 'text',
  EMAIL: 'email',
  PHONE: 'tel',
  NUMBER: 'number',
  DATE: 'date',
} as const;

export function DynamicForm({
  form,
  acceptedExtensions,
}: {
  form: PublicForm;
  acceptedExtensions: string[];
}) {
  const [state, action] = useActionState(submitDynamicForm.bind(null, form.slug), initialFormState);

  function renderField(field: PublicFormField) {
    const common = {
      label: field.label,
      required: field.isRequired,
      ...fieldState(state, field.key),
    };

    switch (field.type) {
      case 'TEXTAREA':
        return <TextareaField {...common} />;
      case 'SELECT':
        return (
          <Field {...common}>
            {({ defaultValue, ...control }) => (
              <select {...control} defaultValue={defaultValue ?? ''}>
                <option value="" disabled>
                  انتخاب کنید
                </option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </Field>
        );
      case 'FILE':
        return (
          <Field
            {...common}
            defaultValue={undefined}
            hint={`حداکثر ۱۰ مگابایت — ${acceptedExtensions.join('، ')}`}
          >
            {(control) => <input {...control} type="file" accept={acceptedExtensions.join(',')} />}
          </Field>
        );
      case 'CHECKBOX':
        return (
          <div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name={field.key}
                required={field.isRequired}
                defaultChecked={common.defaultValue === 'on'}
                aria-invalid={common.error ? true : undefined}
                className="size-4 accent-primary"
              />
              {field.label}
              {field.isRequired ? <span className="text-danger">*</span> : null}
            </label>
            {common.error ? <p className="mt-1 text-xs text-danger">{common.error}</p> : null}
          </div>
        );
      default:
        return <TextField {...common} type={inputTypes[field.type]} />;
    }
  }

  return (
    <form action={action} className="relative space-y-4" noValidate>
      <FormMessage state={state} />
      {form.fields.map((field) => (
        <div key={field.key}>{renderField(field)}</div>
      ))}
      <Honeypot />
      <SubmitButton>ارسال</SubmitButton>
    </form>
  );
}
