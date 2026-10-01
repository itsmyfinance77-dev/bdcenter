'use client';

import { useActionState, useState } from 'react';
import {
  Field,
  fieldState,
  FormMessage,
  Honeypot,
  SubmitButton,
  TextareaField,
  TextField,
} from '@/components/form-controls';
import { Icon } from '@/components/site/icons';
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

/** Field types that take the full row in the two-column layout. */
const wide = new Set(['TEXTAREA', 'FILE', 'CHECKBOX']);

/** File input styled as a dashed drop zone that shows the chosen file name. */
function FileDrop({
  control,
  accept,
}: {
  control: { id: string; name: string; className: string; [key: string]: unknown };
  accept: string;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const { className: _unused, defaultValue: _none, ...input } = control;
  void _unused;
  void _none;
  return (
    <div className="relative flex min-h-[72px] items-center gap-3.5 rounded-[14px] border-[1.5px] border-dashed border-line-strong bg-surface px-4 py-3.5 transition-[border-color,background-color,box-shadow] duration-200 focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(20,80,200,.15)] has-aria-invalid:border-danger">
      <span className="grid size-10 flex-none place-items-center rounded-[11px] bg-primary-tint text-primary">
        <Icon name="upload" size={20} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[14.5px] font-bold text-brand-900">
          {fileName ?? 'انتخاب فایل'}
        </span>
        <span className="text-[12.5px] text-ink-2">
          برای انتخاب کلیک کنید یا فایل را اینجا رها کنید
        </span>
      </span>
      <input
        {...input}
        type="file"
        accept={accept}
        onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </div>
  );
}

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
              <select key={defaultValue} {...control} defaultValue={defaultValue ?? ''}>
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
            {(control) => <FileDrop control={control} accept={acceptedExtensions.join(',')} />}
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
            {common.error ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-danger">
                <Icon name="alert" size={14} strokeWidth={2.2} className="flex-none" />
                {common.error}
              </p>
            ) : null}
          </div>
        );
      default:
        return <TextField {...common} type={inputTypes[field.type]} />;
    }
  }

  return (
    <form action={action} className="relative grid gap-x-4 gap-y-[18px] sm:grid-cols-2" noValidate>
      {state.status === 'idle' ? null : (
        <div className="sm:col-span-2">
          <FormMessage state={state} />
        </div>
      )}
      {form.fields.map((field) => (
        <div key={field.key} className={wide.has(field.type) ? 'sm:col-span-2' : undefined}>
          {renderField(field)}
        </div>
      ))}
      <Honeypot />
      <div className="mt-1.5 sm:col-span-2">
        <SubmitButton>ثبت درخواست</SubmitButton>
      </div>
    </form>
  );
}
