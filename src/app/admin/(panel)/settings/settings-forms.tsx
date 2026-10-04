'use client';

import { useActionState, useEffect, useState } from 'react';
import {
  fieldState,
  FormMessage,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
} from '@/components/form-controls';
import { alertKindLabel, menuIconLabel } from '@/content/admin';
import { actionResultKey, type FormState } from '@/lib/form-state';
import { AnnouncementBar } from '@/components/site/announcement-bar';
import { ANNOUNCEMENT_LONG, ANNOUNCEMENT_MAX } from '@/modules/settings/announcement-limits';
import {
  defaultHomeTexts,
  HOME_TEXT_KEYS,
  homeTextLabels,
  homeTextLimits,
  type HomeTextKey,
} from '@/modules/settings/home-texts';
import {
  saveAlertsAction,
  saveAnnouncementAction,
  saveContactAction,
  saveHomeTextsAction,
  saveMenuAction,
  saveRemindersAction,
  saveStatsAction,
} from './actions';

function useForm(
  action: (prev: FormState, data: FormData) => Promise<FormState>,
  initial: Record<string, string>,
) {
  const initialState: FormState = { status: 'error', message: '', errors: {}, values: initial };
  const [state, formAction] = useActionState(action, initialState);
  // After a successful save the page re-renders with the stored values.
  const shown = state.status === 'success' ? initialState : state;
  return { state, formAction, field: (name: string) => fieldState(shown, name) };
}

function Message({ state }: { state: FormState }) {
  return state.status === 'success' || (state.status === 'error' && state.message) ? (
    <FormMessage state={state} />
  ) : null;
}

export function ContactSettingsForm({ initial }: { initial: Record<string, string> }) {
  const { state, formAction, field } = useForm(saveContactAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <Message state={state} />
      <TextField label="نشانی" required {...field('address')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="تلفن" required hint="مثلاً ۰۳۵-۹۱۰۹۱۰۵۰" {...field('phone')} />
        <TextField label="داخلی" hint="اختیاری" {...field('phoneExtension')} />
        <TextField label="ایمیل" type="email" hint="اختیاری" {...field('email')} />
        <TextField label="کد پستی" hint="اختیاری" {...field('postalCode')} />
      </div>
      <SubmitButton>ذخیرهٔ اطلاعات تماس</SubmitButton>
    </form>
  );
}

export function AlertSettingsForm({ initial }: { initial: Record<string, string> }) {
  const { state, formAction, field } = useForm(saveAlertsAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <Message state={state} />
      {(Object.keys(alertKindLabel) as (keyof typeof alertKindLabel)[]).map((kind) => (
        <TextareaField
          key={kind}
          label={alertKindLabel[kind]}
          rows={2}
          hint="شمارهٔ همراه یا ایمیل کسانی که باید خبردار شوند؛ هر کدام در یک خط. خالی یعنی به کسی خبر داده نمی‌شود."
          {...field(kind)}
        />
      ))}
      <SubmitButton>ذخیرهٔ گیرندگان</SubmitButton>
    </form>
  );
}

export function StatsSettingsForm({ initial }: { initial: Record<string, string> }) {
  const { state, formAction, field } = useForm(saveStatsAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <Message state={state} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <TextField
            label={`عنوان ${['اول', 'دوم', 'سوم', 'چهارم'][i]}`}
            hint={i === 0 ? 'مثلاً «شرکت آموزش‌دیده»' : undefined}
            {...field(`label${i}`)}
          />
          <TextField
            label="عدد"
            hint={i === 0 ? 'مثلاً «۱۲۰+»' : undefined}
            {...field(`value${i}`)}
          />
        </div>
      ))}
      <SubmitButton>ذخیرهٔ اعداد</SubmitButton>
    </form>
  );
}

export function MenuSettingsForm({
  initial,
  serviceRows,
  mainRows,
}: {
  initial: Record<string, string>;
  serviceRows: number;
  mainRows: number;
}) {
  const { state, formAction, field } = useForm(saveMenuAction, initial);
  const row = (prefix: string, i: number, withIcon: boolean) => (
    <div
      key={`${prefix}${i}`}
      className={`grid gap-3 ${withIcon ? 'sm:grid-cols-[1fr_1fr_160px]' : 'sm:grid-cols-2'}`}
    >
      <TextField
        label={`عنوان ${new Intl.NumberFormat('fa-IR').format(i + 1)}`}
        {...field(`${prefix}${i}title`)}
      />
      <TextField
        label="نشانی"
        hint={i === 0 ? 'مثلاً /courses یا https://...' : undefined}
        {...field(`${prefix}${i}href`)}
      />
      {withIcon ? (
        <SelectField label="نماد" options={menuIconLabel} {...field(`${prefix}${i}icon`)} />
      ) : null}
    </div>
  );
  return (
    <form action={formAction} className="space-y-6">
      <Message state={state} />
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold text-ink">زیرمنوی «خدمات»</legend>
        {Array.from({ length: serviceRows }, (_, i) => row('s', i, true))}
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold text-ink">پیوندهای کنار «خدمات»</legend>
        {Array.from({ length: mainRows }, (_, i) => row('m', i, false))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>ذخیرهٔ منو</SubmitButton>
        <button
          type="submit"
          name="reset"
          value="1"
          onClick={(event) => {
            if (!window.confirm('منوی پیش‌فرض سایت برگردانده شود؟')) event.preventDefault();
          }}
          className="text-sm text-danger hover:underline"
        >
          برگرداندن منوی پیش‌فرض
        </button>
      </div>
    </form>
  );
}

const toneOptions = { info: 'اطلاع‌رسانی (آبی)', warning: 'هشدار (نارنجی)' };

export function AnnouncementSettingsForm({ initial }: { initial: Record<string, string> }) {
  const { state, formAction, field } = useForm(saveAnnouncementAction, initial);
  const values = state.status === 'error' ? state.values : initial;
  const key = actionResultKey(state);
  // Live preview of what visitors will see; follows the text, link and tone as they are typed.
  const [draft, setDraft] = useState(values);
  useEffect(() => setDraft(values), [values]);
  const update = (event: React.FormEvent<HTMLFormElement>) => {
    const target = event.target as HTMLInputElement;
    if (!target.name) return;
    const value = target.type === 'checkbox' ? (target.checked ? 'on' : '') : target.value;
    setDraft((current) => ({ ...current, [target.name]: value }));
  };
  const text = draft.text?.trim() ?? '';
  return (
    <form action={formAction} onInput={update} onChange={update} className="space-y-4">
      <Message state={state} />
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          key={key}
          type="checkbox"
          name="enabled"
          defaultChecked={values.enabled === 'on'}
          className="size-4 accent-primary"
        />
        نمایش اطلاعیه در سایت
      </label>
      <TextareaField
        label="متن اطلاعیه"
        rows={2}
        hint={
          text.length > ANNOUNCEMENT_LONG
            ? `${new Intl.NumberFormat('fa-IR').format(text.length)} نویسه؛ متن بلند روی گوشی در چند خط دیده می‌شود. کوتاه‌تر بهتر است.`
            : `حداکثر ${new Intl.NumberFormat('fa-IR').format(ANNOUNCEMENT_MAX)} نویسه؛ مثلاً «مرکز تا ۱۵ فروردین تعطیل است.»`
        }
        {...field('text')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="پیوند"
          hint="اختیاری؛ صفحه‌ای از همین سایت (مثلاً /news) یا نشانی کامل با https://"
          {...field('link')}
        />
        <TextField
          label="متن پیوند"
          hint="اختیاری؛ پیش‌فرض: «اطلاعات بیشتر»"
          {...field('linkLabel')}
        />
        <TextField
          label="نمایش از"
          hint="اختیاری؛ مثلاً ۱۴۰۵/۱۲/۲۵ ۰۸:۰۰. خالی یعنی از همین حالا."
          {...field('startsAt')}
        />
        <TextField
          label="نمایش تا"
          hint="اختیاری؛ پس از این زمان خودکار برداشته می‌شود. خالی یعنی تا وقتی خاموشش کنید."
          {...field('endsAt')}
        />
        <SelectField label="رنگ" options={toneOptions} {...field('tone')} />
      </div>
      {text ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink">
            پیش‌نمایش
            {draft.enabled === 'on' ? null : (
              <span className="font-normal text-ink-2">
                {' '}
                (تیک «نمایش اطلاعیه در سایت» خاموش است؛ این نوار در سایت دیده نمی‌شود)
              </span>
            )}
          </p>
          <div className="overflow-hidden rounded-control border border-line">
            <AnnouncementBar
              preview
              announcement={{
                text,
                link: draft.link?.trim() || null,
                linkLabel: draft.linkLabel?.trim() || 'اطلاعات بیشتر',
                tone: draft.tone === 'warning' ? 'warning' : 'info',
                key: 'preview',
              }}
            />
          </div>
        </div>
      ) : null}
      <SubmitButton>ذخیرهٔ اطلاعیه</SubmitButton>
    </form>
  );
}

const hourOptions = Object.fromEntries(
  Array.from({ length: 24 }, (_, hour) => [
    String(hour),
    new Intl.NumberFormat('fa-IR', { minimumIntegerDigits: 2 }).format(hour) + ':۰۰',
  ]),
);

export function ReminderSettingsForm({ initial }: { initial: Record<string, string> }) {
  const { state, formAction, field } = useForm(saveRemindersAction, initial);
  const values = state.status === 'error' ? state.values : initial;
  // React resets the form after an action: remount the checkboxes with the right state.
  const key = actionResultKey(state);
  const toggle = (name: string, label: string) => (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input
        key={key}
        type="checkbox"
        name={name}
        defaultChecked={values[name] === 'on'}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  );
  return (
    <form action={formAction} className="space-y-5">
      <Message state={state} />
      <fieldset className="space-y-3">
        {toggle('bookingsEnabled', 'یادآوری نوبت‌های مشاوره و میز خدمت')}
        <TextField
          label="چند ساعت پیش از نوبت"
          hint="بین ۱ تا ۷۲ ساعت؛ ۲۴ یعنی یک روز پیش از نوبت."
          {...field('bookingsHours')}
        />
      </fieldset>
      <fieldset className="space-y-3">
        {toggle('coursesEnabled', 'یادآوری جلسه‌های دوره به ثبت‌نام‌های پذیرفته‌شده')}
        <TextField
          label="چند ساعت پیش از هر جلسهٔ دوره"
          hint="بین ۱ تا ۷۲ ساعت."
          {...field('coursesHours')}
        />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="پیامک نفرست از ساعت" options={hourOptions} {...field('quietFrom')} />
        <SelectField label="تا ساعت" options={hourOptions} {...field('quietUntil')} />
      </div>
      <SubmitButton>ذخیرهٔ تنظیمات یادآوری</SubmitButton>
    </form>
  );
}

export function HomeTextsForm({ initial }: { initial: Record<string, string> }) {
  const { state, formAction, field } = useForm(saveHomeTextsAction, initial);
  // Live lengths, for the "longer than the design" hint.
  const [lengths, setLengths] = useState<Record<string, number>>(() =>
    Object.fromEntries(HOME_TEXT_KEYS.map((key) => [key, (initial[key] ?? '').trim().length])),
  );
  const digits = new Intl.NumberFormat('fa-IR');
  const hint = (key: HomeTextKey) => {
    const { fits } = homeTextLimits[key];
    const long = (lengths[key] ?? 0) > fits;
    return `${long ? `بلندتر از اندازهٔ طراحی (${digits.format(fits)} نویسه)؛ در چند خط شکسته می‌شود. ` : ''}پیش‌فرض: «${defaultHomeTexts[key]}»`;
  };
  return (
    <form
      action={formAction}
      onInput={(event) => {
        const target = event.target as HTMLInputElement;
        if (target.name)
          setLengths((current) => ({ ...current, [target.name]: target.value.trim().length }));
      }}
      className="space-y-4"
    >
      <Message state={state} />
      {HOME_TEXT_KEYS.map((key) =>
        key === 'heroLead' ? (
          <TextareaField
            key={key}
            label={homeTextLabels[key]}
            rows={3}
            hint={hint(key)}
            {...field(key)}
          />
        ) : (
          <TextField key={key} label={homeTextLabels[key]} hint={hint(key)} {...field(key)} />
        ),
      )}
      <SubmitButton>ذخیرهٔ متن‌ها</SubmitButton>
    </form>
  );
}
