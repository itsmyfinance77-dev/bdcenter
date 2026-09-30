'use client';

import { useActionState, useState } from 'react';
import {
  fieldState,
  FormMessage,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
} from '@/components/form-controls';
import { contentStatusLabel, formFieldTypeLabel } from '@/content/admin';
import type { FormState } from '@/lib/form-state';
import { saveFormAction } from './actions';

type FieldType = keyof typeof formFieldTypeLabel;

export type BuilderField = {
  key: string;
  label: string;
  type: FieldType;
  isRequired: boolean;
  options: string[];
};

const inputClass =
  'block w-full rounded-control border border-line bg-white px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none';
const iconButton =
  'rounded-control border border-line bg-white px-2 py-1 text-xs text-ink hover:border-line-hover disabled:opacity-40';

export function FormBuilder({
  id,
  initial,
  initialFields,
}: {
  id: string | null;
  initial: Record<string, string>;
  initialFields: BuilderField[];
}) {
  const initialState: FormState = { status: 'error', message: '', errors: {}, values: initial };
  const [state, action] = useActionState(saveFormAction.bind(null, id), initialState);
  const [fields, setFields] = useState<BuilderField[]>(initialFields);
  const field = (name: string) => fieldState(state, name);

  function update(index: number, patch: Partial<BuilderField>) {
    setFields((current) => current.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }
  function move(index: number, offset: -1 | 1) {
    setFields((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(index + offset, 0, item!);
      return next;
    });
  }
  function add() {
    setFields((current) => [
      ...current,
      {
        key: `field_${current.length + 1}`,
        label: '',
        type: 'TEXT',
        isRequired: false,
        options: [],
      },
    ]);
  }

  const fieldsError = state.status === 'error' ? state.errors.fields : undefined;

  return (
    <form action={action} className="space-y-6">
      {state.status === 'error' && state.message ? <FormMessage state={state} /> : null}

      <section className="space-y-4 rounded-panel border border-line bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="عنوان فرم" required {...field('title')} />
          <TextField
            label="نامک (آدرس فرم)"
            required
            hint="حروف انگلیسی کوچک، عدد و خط تیره؛ مثلاً service-desk"
            {...field('slug')}
          />
        </div>
        <TextareaField label="توضیحات" rows={2} {...field('description')} />
        <SelectField label="وضعیت" options={contentStatusLabel} {...field('status')} />
      </section>

      <section className="space-y-3 rounded-panel border border-line bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">فیلدها</h2>
          <button type="button" onClick={add} className={iconButton}>
            + افزودن فیلد
          </button>
        </div>
        {fieldsError ? <p className="text-sm text-danger">{fieldsError}</p> : null}
        <input
          type="hidden"
          name="fields"
          value={JSON.stringify(
            fields.map((f) => ({ ...f, options: f.options.map((o) => o.trim()).filter(Boolean) })),
          )}
        />
        <ol className="space-y-3">
          {fields.map((f, index) => (
            <li key={index} className="rounded-card border border-line p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_160px]">
                <label className="text-xs text-ink-2">
                  برچسب
                  <input
                    className={inputClass}
                    value={f.label}
                    onChange={(e) => update(index, { label: e.target.value })}
                  />
                </label>
                <label className="text-xs text-ink-2">
                  کلید (انگلیسی)
                  <input
                    className={inputClass}
                    dir="ltr"
                    value={f.key}
                    onChange={(e) => update(index, { key: e.target.value })}
                  />
                </label>
                <label className="text-xs text-ink-2">
                  نوع
                  <select
                    className={inputClass}
                    value={f.type}
                    onChange={(e) => update(index, { type: e.target.value as FieldType })}
                  >
                    {Object.entries(formFieldTypeLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {f.type === 'SELECT' ? (
                <label className="mt-3 block text-xs text-ink-2">
                  گزینه‌ها (هر گزینه در یک خط)
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={f.options.join('\n')}
                    onChange={(e) =>
                      // Kept raw while typing; trimmed when serialized above.
                      update(index, { options: e.target.value.split('\n') })
                    }
                  />
                </label>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={f.isRequired}
                    onChange={(e) => update(index, { isRequired: e.target.checked })}
                    className="size-4 accent-primary"
                  />
                  الزامی
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className={iconButton}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="انتقال به بالا"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="انتقال به پایین"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={`${iconButton} text-danger`}
                    onClick={() => setFields((current) => current.filter((_, i) => i !== index))}
                  >
                    حذف
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-ink-2">
          تغییر یا حذف فیلدها روی درخواست‌های قبلی اثری ندارد؛ داده‌های ثبت‌شده حفظ می‌شوند.
        </p>
      </section>

      <SubmitButton>ذخیره فرم</SubmitButton>
    </form>
  );
}
