'use client';

import { useActionState, useRef, useState } from 'react';
import { Field, FormMessage, Honeypot, SubmitButton } from '@/components/form-controls';
import { Icon } from '@/components/site/icons';
import { actionResultKey, initialFormState, type FormState } from '@/lib/form-state';
import {
  FILE_KINDS,
  formSteps,
  MAX_FILE_MB,
  visibleFieldKeys,
  type PublicFormField,
} from '@/modules/forms/fields';
import type { PublicForm } from '@/modules/forms/service';
import { submitDynamicForm } from './actions';

/** How each typed field is entered: input type, keyboard and direction. */
const inputs: Partial<
  Record<
    PublicFormField['type'],
    {
      type: string;
      inputMode?: 'numeric' | 'tel' | 'email' | 'decimal';
      ltr?: boolean;
      /** Shown as «مثلاً …» under the field. */
      example?: string;
      /** Shown as is under the field. */
      note?: string;
    }
  >
> = {
  TEXT: { type: 'text' },
  EMAIL: { type: 'email', inputMode: 'email', ltr: true },
  PHONE: { type: 'tel', inputMode: 'tel', ltr: true },
  MOBILE: { type: 'tel', inputMode: 'tel', ltr: true, example: '۰۹۱۲۳۴۵۶۷۸۹' },
  NUMBER: { type: 'text', inputMode: 'decimal' },
  NATIONAL_CODE: { type: 'text', inputMode: 'numeric', ltr: true, note: '۱۰ رقم' },
  LEGAL_ID: { type: 'text', inputMode: 'numeric', ltr: true, note: '۱۱ رقم' },
  POSTAL_CODE: { type: 'text', inputMode: 'numeric', ltr: true, note: '۱۰ رقم' },
  JALALI_DATE: { type: 'text', inputMode: 'numeric', example: '۱۴۰۵/۰۷/۱۵' },
  TIME: { type: 'text', inputMode: 'numeric', example: '۱۶:۳۰' },
  DATE: { type: 'date' },
};

/** Field types that take the full row in the two-column layout. */
const wide = new Set([
  'TEXTAREA',
  'FILE',
  'CHECKBOX',
  'RADIO',
  'MULTI_CHOICE',
  'RATING',
  'SECTION',
]);
const digits = new Intl.NumberFormat('fa-IR');

/** What the field shows: what was sent (after an error), else its default. */
function shownValue(
  state: FormState,
  field: PublicFormField,
  prefill: Record<string, string> = {},
): string | undefined {
  if (state.status === 'error') return state.values[field.key];
  if (prefill[field.key]) return prefill[field.key];
  // Multi-choice has no preset (the builder offers none).
  return field.type === 'MULTI_CHOICE' ? undefined : field.settings.defaultValue;
}

function ErrorLine({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-danger">
      <Icon name="alert" size={14} strokeWidth={2.2} className="flex-none" />
      {error}
    </p>
  ) : null;
}

/**
 * Radio buttons, checkboxes or a score scale as one group: a fieldset whose
 * legend is the question, so screen readers read it with every option.
 */
function ChoiceGroup({
  field,
  state,
  kind,
}: {
  field: PublicFormField;
  state: FormState;
  kind: 'radio' | 'checkbox' | 'rating';
}) {
  const error = state.status === 'error' ? state.errors[field.key] : undefined;
  const sent = shownValue(state, field);
  // Several checked boxes come back joined by new lines (see the action).
  const chosen = new Set(sent ? sent.split('\n') : []);
  const key = actionResultKey(state);
  const errorId = `field-${field.key}-error`;
  const choices =
    kind === 'rating'
      ? Array.from({ length: field.settings.scale ?? 5 }, (_, i) => String(i + 1))
      : field.options;
  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="mb-2 text-sm font-semibold text-ink">
        {field.label}
        {field.isRequired ? (
          <span aria-hidden="true" className="text-danger">
            {' '}
            *
          </span>
        ) : null}
      </legend>
      {field.settings.hint ? (
        <p className="mb-2 text-[12.5px] leading-[1.8] text-ink-2">{field.settings.hint}</p>
      ) : null}
      <div className={kind === 'rating' ? 'flex flex-wrap gap-2' : 'flex flex-col gap-2'}>
        {choices.map((choice) =>
          kind === 'rating' ? (
            <label
              key={`${key}-${choice}`}
              className="grid size-11 cursor-pointer place-items-center rounded-control border-[1.5px] border-line bg-white text-lg font-extrabold text-brand-900 transition-colors hover:border-primary has-checked:border-primary has-checked:bg-primary has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
            >
              <input
                type="radio"
                name={field.key}
                value={choice}
                defaultChecked={chosen.has(choice)}
                className="sr-only"
              />
              {digits.format(Number(choice))}
            </label>
          ) : (
            <label key={`${key}-${choice}`} className="flex items-center gap-2 text-sm text-ink">
              <input
                type={kind}
                name={field.key}
                value={choice}
                defaultChecked={chosen.has(choice)}
                className="size-4 flex-none accent-primary"
              />
              {choice}
            </label>
          ),
        )}
      </div>
      <ErrorLine id={errorId} error={error} />
    </fieldset>
  );
}

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

type Answers = Record<string, string[]>;

/** The answers the form starts with, as the fields will show them. */
function startingAnswers(
  fields: PublicFormField[],
  state: FormState,
  prefill: Record<string, string>,
): Answers {
  const result: Answers = {};
  for (const field of fields) {
    const value = shownValue(state, field, prefill);
    if (value) result[field.key] = value.split('\n');
  }
  return result;
}

/** What is filled in right now; an unchosen file counts as empty. */
function readAnswers(form: HTMLFormElement): Answers {
  const result: Answers = {};
  const data = new FormData(form);
  for (const key of new Set(data.keys())) {
    const given = data
      .getAll(key)
      .map((value) => (typeof value === 'string' ? value : value.size > 0 ? value.name : ''))
      .filter(Boolean);
    if (given.length) result[key] = given;
  }
  return result;
}

export function DynamicForm({
  form,
  prefill = {},
}: {
  form: PublicForm;
  /** Starting values from the member's profile (members-only forms). */
  prefill?: Record<string, string>;
}) {
  const [state, action] = useActionState(submitDynamicForm.bind(null, form.slug), initialFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const progressRef = useRef<HTMLParagraphElement>(null);
  const { stepOf, titles } = formSteps(form.fields);
  const [answers, setAnswers] = useState(() => startingAnswers(form.fields, state, prefill));
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);

  // After each send React resets the form: start again from what it shows,
  // on the first step that has an error (or the first step).
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    setAnswers(startingAnswers(form.fields, state, prefill));
    setStepError(null);
    const errorSteps =
      state.status === 'error'
        ? Object.keys(state.errors).flatMap((key) => stepOf.get(key) ?? [])
        : [];
    setStep(errorSteps.length ? Math.min(...errorSteps) : 0);
  }

  const visible = visibleFieldKeys(form.fields, answers);
  // Steps whose questions are all hidden by conditions are skipped.
  const steps = titles
    .map((_, index) => index)
    .filter((index) =>
      form.fields.some(
        (f) => stepOf.get(f.key) === index && f.type !== 'SECTION' && visible.has(f.key),
      ),
    );
  if (steps.length === 0) steps.push(0);
  const position = Math.max(
    0,
    steps.findLastIndex((index) => index <= step),
  );
  const current = steps[position]!;
  const last = position === steps.length - 1;

  function go(offset: 1 | -1) {
    if (offset === 1) {
      const missing = form.fields.filter(
        (f) =>
          stepOf.get(f.key) === current &&
          f.isRequired &&
          f.type !== 'SECTION' &&
          visible.has(f.key) &&
          !answers[f.key]?.length,
      );
      if (missing.length) {
        setStepError(
          `پیش از رفتن به مرحلهٔ بعد این‌ها را پر کنید: ${missing.map((f) => f.label).join('، ')}`,
        );
        return;
      }
    }
    setStepError(null);
    setStep(steps[position + offset]!);
    formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    progressRef.current?.focus({ preventScroll: true });
  }

  function renderField(field: PublicFormField) {
    const { settings } = field;
    const common = {
      name: field.key,
      label: field.label,
      required: field.isRequired,
      error: state.status === 'error' ? state.errors[field.key] : undefined,
      defaultValue: shownValue(state, field, prefill),
    };

    switch (field.type) {
      case 'SECTION':
        return (
          <div className="border-t border-line pt-5">
            <h3 className="text-lg font-extrabold text-brand-900">{field.label}</h3>
            {settings.hint ? (
              <p className="mt-1.5 text-sm leading-7 whitespace-pre-line text-ink-2">
                {settings.hint}
              </p>
            ) : null}
          </div>
        );
      case 'TEXTAREA':
        return (
          <Field {...common} hint={settings.hint}>
            {(control) => (
              <textarea
                {...control}
                rows={5}
                placeholder={settings.placeholder}
                maxLength={settings.maxLength}
              />
            )}
          </Field>
        );
      case 'SELECT':
        return (
          <Field {...common} hint={settings.hint}>
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
      case 'RADIO':
        return <ChoiceGroup field={field} state={state} kind="radio" />;
      case 'MULTI_CHOICE':
        return <ChoiceGroup field={field} state={state} kind="checkbox" />;
      case 'RATING':
        return <ChoiceGroup field={field} state={state} kind="rating" />;
      case 'FILE': {
        const kinds = settings.fileKinds?.length ? settings.fileKinds : null;
        const accept = kinds
          ? kinds.flatMap((kind) => FILE_KINDS[kind].types).join(',')
          : Object.values(FILE_KINDS)
              .flatMap((kind) => kind.types)
              .join(',');
        const allowed = (kinds ?? (Object.keys(FILE_KINDS) as (keyof typeof FILE_KINDS)[]))
          .map((kind) => FILE_KINDS[kind].label)
          .join('، ');
        const size = digits.format(settings.maxSizeMb ?? MAX_FILE_MB);
        return (
          <Field
            {...common}
            defaultValue={undefined}
            hint={[settings.hint, `حداکثر ${size} مگابایت — ${allowed}`]
              .filter(Boolean)
              .join(' · ')}
          >
            {(control) => <FileDrop control={control} accept={accept} />}
          </Field>
        );
      }
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
                aria-describedby={common.error ? `field-${field.key}-error` : undefined}
                className="size-4 accent-primary"
              />
              {field.label}
              {field.isRequired ? <span className="text-danger">*</span> : null}
            </label>
            {settings.hint ? (
              <p className="mt-1 text-[12.5px] leading-[1.8] text-ink-2">{settings.hint}</p>
            ) : null}
            <ErrorLine id={`field-${field.key}-error`} error={common.error} />
          </div>
        );
      default: {
        const input = inputs[field.type] ?? { type: 'text' };
        const hint = [settings.hint, input.example ? `مثلاً ${input.example}` : input.note]
          .filter(Boolean)
          .join(' · ');
        return (
          <Field {...common} hint={hint || undefined}>
            {(control) => (
              <input
                {...control}
                type={input.type}
                inputMode={input.inputMode}
                dir={input.ltr ? 'ltr' : undefined}
                placeholder={settings.placeholder}
                maxLength={settings.maxLength}
              />
            )}
          </Field>
        );
      }
    }
  }

  return (
    <form
      ref={formRef}
      action={action}
      onChange={(event) => setAnswers(readAnswers(event.currentTarget))}
      onKeyDown={(event) => {
        // Enter in a one-line box moves on instead of sending a half-filled form.
        const target = event.target as HTMLElement;
        if (event.key === 'Enter' && !last && target.tagName === 'INPUT') {
          event.preventDefault();
          go(1);
        }
      }}
      className="relative grid scroll-mt-24 gap-x-4 gap-y-[18px] sm:grid-cols-2"
      noValidate
    >
      {state.status === 'idle' ? null : (
        <div className="sm:col-span-2">
          <FormMessage state={state} />
        </div>
      )}
      {steps.length > 1 ? (
        <div className="sm:col-span-2">
          <p
            ref={progressRef}
            tabIndex={-1}
            className="mb-2 text-sm font-bold text-brand-900 outline-none"
            aria-live="polite"
          >
            مرحلهٔ {digits.format(position + 1)} از {digits.format(steps.length)}
            {titles[current] ? `: ${titles[current]}` : ''}
          </p>
          <div
            role="progressbar"
            aria-label="پیشرفت فرم"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={position + 1}
            className="h-2 overflow-hidden rounded-chip bg-surface"
          >
            <div
              className="h-full rounded-chip bg-primary transition-[width] duration-300"
              style={{ width: `${((position + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      ) : null}
      {form.fields.map((field) => {
        const shown = visible.has(field.key);
        // A hidden question is disabled, so it is not sent; another step's is
        // only out of sight, so its answer still goes with the form.
        return (
          <fieldset
            key={field.key}
            disabled={!shown}
            hidden={!shown || stepOf.get(field.key) !== current}
            className={`min-w-0 ${wide.has(field.type) ? 'sm:col-span-2' : ''}`}
          >
            {renderField(field)}
          </fieldset>
        );
      })}
      <Honeypot />
      {stepError ? (
        <p role="alert" className="text-[13px] font-semibold text-danger sm:col-span-2">
          {stepError}
        </p>
      ) : null}
      <div className="mt-1.5 flex flex-wrap items-center gap-3 sm:col-span-2">
        {position > 0 ? (
          <button
            type="button"
            onClick={() => go(-1)}
            className="min-h-[50px] rounded-control border-[1.5px] border-line bg-white px-6 text-[15px] font-bold text-brand-900 hover:border-primary"
          >
            مرحلهٔ قبل
          </button>
        ) : null}
        {last ? (
          <SubmitButton>ثبت درخواست</SubmitButton>
        ) : (
          <button
            type="button"
            onClick={() => go(1)}
            className="min-h-[50px] rounded-control bg-primary px-6 text-[15px] font-bold text-white hover:bg-primary-hover"
          >
            مرحلهٔ بعد
          </button>
        )}
      </div>
    </form>
  );
}
