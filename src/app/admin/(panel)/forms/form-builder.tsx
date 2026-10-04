'use client';

import { useActionState, useState } from 'react';
import {
  fieldState,
  FormMessage,
  SelectField,
  SubmitButton,
  TextField,
} from '@/components/form-controls';
import { RichEditor } from '@/components/admin/rich-editor';
import { contentStatusLabel, formFieldTypeLabel } from '@/content/admin';
import type { FormState } from '@/lib/form-state';
import {
  CHOICE_TYPES,
  FILE_KINDS,
  MAX_FILE_MB,
  TEXT_TYPES,
  type FieldSettings,
  type FieldType,
  type FileKind,
} from '@/modules/forms/fields';
import { saveFormAction } from './actions';

export type BuilderField = {
  key: string;
  label: string;
  type: FieldType;
  isRequired: boolean;
  options: string[];
  settings: FieldSettings;
};

const inputClass =
  'block w-full rounded-control border border-line bg-white px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none';
const iconButton =
  'rounded-control border border-line bg-white px-2 py-1 text-xs text-ink hover:border-line-hover disabled:opacity-40';

/** Digits typed in any script; empty = not set. */
function numberOrUndefined(text: string): number | undefined {
  const latin = text.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).trim();
  if (latin === '') return undefined;
  const value = Number(latin);
  return Number.isFinite(value) ? value : undefined;
}

/** `field_n` with the first n no field uses yet. */
function freeKey(keys: string[]): string {
  const taken = new Set(keys);
  let n = keys.length + 1;
  while (taken.has(`field_${n}`)) n += 1;
  return `field_${n}`;
}

/** Settings that only make sense for some types are dropped when the type changes. */
function settingsFor(type: FieldType, settings: FieldSettings): FieldSettings {
  const keep: (keyof FieldSettings)[] = ['hint'];
  if (TEXT_TYPES.has(type)) keep.push('placeholder', 'defaultValue', 'minLength', 'maxLength');
  else if (type === 'NUMBER') keep.push('placeholder', 'defaultValue', 'min', 'max');
  else if (type === 'FILE') keep.push('fileKinds', 'maxSizeMb');
  else if (type === 'RATING') keep.push('scale');
  // A preset choice only for single-choice fields (multi-choice has no default control).
  else if (type === 'SELECT' || type === 'RADIO') keep.push('defaultValue');
  else if (type !== 'SECTION' && type !== 'CHECKBOX') keep.push('placeholder', 'defaultValue');
  return Object.fromEntries(
    keep.filter((key) => settings[key] !== undefined).map((key) => [key, settings[key]]),
  ) as FieldSettings;
}

function SmallInput({
  label,
  value,
  onChange,
  ltr,
}: {
  label: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  ltr?: boolean;
}) {
  return (
    <label className="text-xs text-ink-2">
      {label}
      <input
        className={inputClass}
        dir={ltr ? 'ltr' : undefined}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

/**
 * A number setting. Keeps what is typed (e.g. a lone "-" on the way to "-5")
 * and passes the number up once it reads as one; empty = not set.
 */
function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  return (
    <SmallInput
      label={label}
      ltr
      value={text}
      onChange={(next) => {
        setText(next);
        onChange(numberOrUndefined(next));
      }}
    />
  );
}

/** One field's row: label, key, type, options, settings and the order buttons. */
function FieldEditor({
  field,
  index,
  count,
  update,
  move,
  remove,
}: {
  field: BuilderField;
  index: number;
  count: number;
  update: (patch: Partial<BuilderField>) => void;
  move: (offset: -1 | 1) => void;
  remove: () => void;
}) {
  const { type, settings } = field;
  const set = (patch: Partial<FieldSettings>) => update({ settings: { ...settings, ...patch } });
  const isSection = type === 'SECTION';
  const hasSettings = Object.keys(settings).some(
    (key) => settings[key as keyof FieldSettings] !== undefined,
  );

  return (
    <li className="rounded-card border border-line p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_200px]">
        <SmallInput
          label={isSection ? 'عنوان بخش' : 'برچسب'}
          value={field.label}
          onChange={(label) => update({ label })}
        />
        <SmallInput
          label="کلید (انگلیسی)"
          ltr
          value={field.key}
          onChange={(key) => update({ key })}
        />
        <label className="text-xs text-ink-2">
          نوع
          <select
            className={inputClass}
            value={type}
            onChange={(event) => {
              const next = event.target.value as FieldType;
              update({ type: next, settings: settingsFor(next, settings) });
            }}
          >
            {Object.entries(formFieldTypeLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {CHOICE_TYPES.has(type) ? (
        <label className="mt-3 block text-xs text-ink-2">
          گزینه‌ها (هر گزینه در یک خط)
          <textarea
            className={inputClass}
            rows={3}
            value={field.options.join('\n')}
            // Kept raw while typing; trimmed when the form is sent.
            onChange={(event) => update({ options: event.target.value.split('\n') })}
          />
        </label>
      ) : null}

      <details className="mt-3 rounded-control bg-surface px-3 py-2" open={hasSettings}>
        <summary className="cursor-pointer text-xs font-semibold text-ink">
          {isSection ? 'متن توضیح زیر عنوان' : 'تنظیمات بیشتر'}
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-ink-2 sm:col-span-2">
            {isSection ? 'توضیح' : 'راهنمای زیر فیلد'}
            <textarea
              className={inputClass}
              rows={2}
              value={settings.hint ?? ''}
              onChange={(event) => set({ hint: event.target.value || undefined })}
            />
          </label>
          {TEXT_TYPES.has(type) ||
          (!isSection &&
            !CHOICE_TYPES.has(type) &&
            !['FILE', 'RATING', 'CHECKBOX'].includes(type)) ? (
            <SmallInput
              label="متن نمونه داخل کادر"
              value={settings.placeholder}
              onChange={(value) => set({ placeholder: value || undefined })}
            />
          ) : null}
          {!isSection && !['FILE', 'RATING', 'CHECKBOX', 'MULTI_CHOICE'].includes(type) ? (
            <SmallInput
              label={CHOICE_TYPES.has(type) ? 'گزینهٔ پیش‌فرض' : 'مقدار پیش‌فرض'}
              value={settings.defaultValue}
              onChange={(value) => set({ defaultValue: value || undefined })}
            />
          ) : null}
          {TEXT_TYPES.has(type) ? (
            <>
              <NumberInput
                label="حداقل تعداد نویسه"
                value={settings.minLength}
                onChange={(value) => set({ minLength: value })}
              />
              <NumberInput
                label="حداکثر تعداد نویسه"
                value={settings.maxLength}
                onChange={(value) => set({ maxLength: value })}
              />
            </>
          ) : null}
          {type === 'NUMBER' ? (
            <>
              <NumberInput
                label="کمترین عدد"
                value={settings.min}
                onChange={(value) => set({ min: value })}
              />
              <NumberInput
                label="بیشترین عدد"
                value={settings.max}
                onChange={(value) => set({ max: value })}
              />
            </>
          ) : null}
          {type === 'RATING' ? (
            <NumberInput
              label="بیشترین امتیاز (۳ تا ۱۰؛ پیش‌فرض ۵)"
              value={settings.scale}
              onChange={(value) => set({ scale: value })}
            />
          ) : null}
          {type === 'FILE' ? (
            <>
              <fieldset className="text-xs text-ink-2 sm:col-span-2">
                <legend>نوع فایل‌های مجاز (هیچ‌کدام = همه)</legend>
                <div className="mt-1 flex flex-wrap gap-4">
                  {(Object.keys(FILE_KINDS) as FileKind[]).map((kind) => (
                    <label key={kind} className="flex items-center gap-1.5 text-sm text-ink">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={settings.fileKinds?.includes(kind) ?? false}
                        onChange={(event) => {
                          const current = new Set(settings.fileKinds ?? []);
                          if (event.target.checked) current.add(kind);
                          else current.delete(kind);
                          set({ fileKinds: current.size ? [...current] : undefined });
                        }}
                      />
                      {FILE_KINDS[kind].label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <NumberInput
                label={`حداکثر حجم (مگابایت، تا ${new Intl.NumberFormat('fa-IR').format(MAX_FILE_MB)})`}
                value={settings.maxSizeMb}
                onChange={(value) => set({ maxSizeMb: value })}
              />
            </>
          ) : null}
        </div>
      </details>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {isSection ? (
          <span />
        ) : (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={field.isRequired}
              onChange={(event) => update({ isRequired: event.target.checked })}
              className="size-4 accent-primary"
            />
            الزامی
          </label>
        )}
        <div className="flex gap-1">
          <button
            type="button"
            className={iconButton}
            disabled={index === 0}
            onClick={() => move(-1)}
            aria-label="انتقال به بالا"
          >
            ↑
          </button>
          <button
            type="button"
            className={iconButton}
            disabled={index === count - 1}
            onClick={() => move(1)}
            aria-label="انتقال به پایین"
          >
            ↓
          </button>
          <button type="button" className={`${iconButton} text-danger`} onClick={remove}>
            حذف
          </button>
        </div>
      </div>
    </li>
  );
}

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
        key: freeKey(current.map((field) => field.key)),
        label: '',
        type: 'TEXT',
        isRequired: false,
        options: [],
        settings: {},
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
        <RichEditor
          key={state.status === 'error' ? state.values.description : 'initial'}
          name="description"
          label="توضیحات بالای فرم"
          required={false}
          initialHtml={(state.status === 'error' ? state.values.description : '') ?? ''}
          error={state.status === 'error' ? state.errors.description : undefined}
        />
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
            fields.map((f) => ({
              ...f,
              options: CHOICE_TYPES.has(f.type)
                ? f.options.map((o) => o.trim()).filter(Boolean)
                : [],
              settings: settingsFor(f.type, f.settings),
            })),
          )}
        />
        <ol className="space-y-3">
          {fields.map((f, index) => (
            <FieldEditor
              key={index}
              field={f}
              index={index}
              count={fields.length}
              update={(patch) => update(index, patch)}
              move={(offset) => move(index, offset)}
              remove={() => setFields((current) => current.filter((_, i) => i !== index))}
            />
          ))}
        </ol>
        <p className="text-xs text-ink-2">
          تغییر یا حذف فیلدها روی درخواست‌های قبلی اثری ندارد؛ هر درخواست با همان برچسب‌هایی که
          هنگام ثبت داشت نمایش داده می‌شود.
        </p>
      </section>

      <SubmitButton>ذخیره فرم</SubmitButton>
    </form>
  );
}
