'use client';

import { useFormStatus } from 'react-dom';
import { HONEYPOT_FIELD, type FormState } from '@/lib/form-state';

const controlClass =
  'block w-full rounded-control border border-line bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 aria-invalid:border-danger';

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
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
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
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-2">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField(
  props: Omit<FieldProps, 'children'> & { type?: 'text' | 'email' | 'tel' | 'number' | 'date' },
) {
  const { type = 'text', ...fieldProps } = props;
  return (
    <Field {...fieldProps}>
      {(control) => (
        <input
          {...control}
          type={type}
          dir={type === 'email' || type === 'tel' ? 'ltr' : undefined}
          inputMode={type === 'number' ? 'decimal' : undefined}
        />
      )}
    </Field>
  );
}

export function TextareaField(props: Omit<FieldProps, 'children'>) {
  return <Field {...props}>{(control) => <textarea {...control} rows={5} />}</Field>;
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
      className="rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
    >
      {pending ? 'در حال ارسال…' : children}
    </button>
  );
}

/** Success/error banner; announced to screen readers when it changes. */
export function FormMessage({ state }: { state: FormState }) {
  if (state.status === 'idle') return null;
  const tone =
    state.status === 'success'
      ? 'border-success/30 bg-success/10 text-success'
      : 'border-danger/30 bg-danger/10 text-danger';
  return (
    <p role="status" className={`rounded-control border px-4 py-3 text-sm ${tone}`}>
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
