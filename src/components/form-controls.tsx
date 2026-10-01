'use client';

import { useFormStatus } from 'react-dom';
import { Icon } from '@/components/site/icons';
import { HONEYPOT_FIELD, type FormState } from '@/lib/form-state';

const controlClass =
  'block min-h-12 w-full rounded-control border-[1.5px] border-line bg-white px-3.5 py-2.5 text-[15px] leading-[1.9] text-ink outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(20,80,200,.15)] focus-visible:outline-none aria-invalid:border-danger';

type FieldProps = {
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  defaultValue?: string;
  children: (props: {
    id: string;
    name: string;
    required?: boolean;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
    defaultValue?: string;
    className: string;
  }) => React.ReactNode;
};

/** Label + control + inline error, wired together for screen readers. */
export function Field({ name, label, required, error, hint, defaultValue, children }: FieldProps) {
  const id = `field-${name}`;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-danger">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {children({
        id,
        name,
        required,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
        defaultValue,
        className: controlClass,
      })}
      {hint ? (
        <p id={`${id}-hint`} className="text-[12.5px] leading-[1.8] text-ink-2">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-danger"
        >
          <Icon name="alert" size={14} strokeWidth={2.2} className="flex-none" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField(
  props: Omit<FieldProps, 'children'> & {
    type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'password';
    autoComplete?: string;
  },
) {
  const { type = 'text', autoComplete, ...fieldProps } = props;
  return (
    <Field {...fieldProps}>
      {(control) => (
        <input
          {...control}
          type={type}
          autoComplete={autoComplete}
          dir={type === 'email' || type === 'tel' || type === 'password' ? 'ltr' : undefined}
          inputMode={type === 'number' ? 'decimal' : undefined}
        />
      )}
    </Field>
  );
}

export function TextareaField({
  rows = 5,
  ...props
}: Omit<FieldProps, 'children'> & { rows?: number }) {
  return <Field {...props}>{(control) => <textarea {...control} rows={rows} />}</Field>;
}

export function SelectField({
  options,
  onChange,
  ...props
}: Omit<FieldProps, 'children'> & {
  options: Record<string, string>;
  onChange?: (value: string) => void;
}) {
  return (
    <Field {...props}>
      {({ defaultValue, ...control }) => (
        // key: React ignores a changed defaultValue on <select> after mount, and the
        // form reset after an action would otherwise snap back to the first render.
        <select
          key={defaultValue}
          {...control}
          defaultValue={defaultValue ?? Object.keys(options)[0]}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        >
          {Object.entries(options).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/** Off-screen input that people never fill; the server drops submissions that do. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
      <label>
        وب‌سایت
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-[50px] cursor-pointer items-center gap-2.5 rounded-control bg-[linear-gradient(135deg,#2a6cf0,#1450c8)] px-[26px] text-[15.5px] font-bold text-white shadow-[0_12px_28px_-12px_rgba(20,80,200,.8)] transition-[transform,box-shadow] duration-250 ease-(--ease-out-soft) hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-12px_rgba(20,80,200,.95)] disabled:translate-y-0 disabled:opacity-60"
    >
      {pending ? 'در حال ارسال…' : children}
    </button>
  );
}

/** Success/error banner; announced to screen readers when it changes. */
export function FormMessage({ state }: { state: FormState }) {
  if (state.status === 'idle') return null;
  const success = state.status === 'success';
  const tone = success
    ? 'border-success/30 bg-success/10 text-success'
    : 'border-danger/30 bg-danger/10 text-danger';
  return (
    <p
      role="status"
      className={`flex items-center gap-2.5 rounded-control border px-4 py-3 text-[14.5px] font-semibold ${tone}`}
    >
      <Icon name={success ? 'check' : 'alert'} size={20} strokeWidth={2} className="flex-none" />
      {state.message}
    </p>
  );
}

/** Error and previously typed value for one input, to spread onto a field. */
export function fieldState(state: FormState, name: string) {
  return state.status === 'error'
    ? { name, error: state.errors[name], defaultValue: state.values[name] }
    : { name };
}
