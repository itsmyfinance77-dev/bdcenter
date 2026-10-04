'use client';

import { useActionState } from 'react';
import {
  Field,
  fieldState,
  FormMessage,
  SelectField,
  SubmitButton,
  TextField,
} from '@/components/form-controls';
import { RichEditor } from '@/components/admin/rich-editor';
import { contentStatusLabel } from '@/content/admin';
import type { FormState } from '@/lib/form-state';
import { saveCourseAction } from './actions';
import { SessionRows } from './session-rows';

export function CourseForm({
  id,
  initial,
  hasCover = false,
  legacyEnd = null,
}: {
  id: string | null;
  initial: Record<string, string>;
  hasCover?: boolean;
  /** A stored course end the sessions do not explain (see unexplainedEnd), formatted. */
  legacyEnd?: string | null;
}) {
  const initialState: FormState = { status: 'error', message: '', errors: {}, values: initial };
  const [state, action] = useActionState(saveCourseAction.bind(null, id), initialState);
  const field = (name: string) => fieldState(state, name);
  const enrollmentOpen = state.status === 'error' ? state.values.enrollmentOpen === 'on' : true;
  const certificateEnabled =
    state.status === 'error' ? state.values.certificateEnabled === 'on' : false;

  return (
    <form action={action} className="space-y-4 rounded-panel border border-line bg-white p-6">
      {state.status === 'error' && state.message ? <FormMessage state={state} /> : null}
      {state.status === 'error' && state.errors._form ? (
        <p className="text-sm text-danger">{state.errors._form}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="وضعیت" options={contentStatusLabel} {...field('status')} />
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
          <input
            key={String(enrollmentOpen)}
            type="checkbox"
            name="enrollmentOpen"
            defaultChecked={enrollmentOpen}
            className="size-4 accent-primary"
          />
          ثبت‌نام باز است
        </label>
      </div>
      <TextField label="عنوان" required {...field('title')} />
      <TextField
        label="نامک (آدرس صفحه)"
        hint="خالی بگذارید تا از روی عنوان ساخته شود."
        {...field('slug')}
      />
      <fieldset className="space-y-3 rounded-card border border-line p-4">
        <legend className="px-1 text-sm font-medium text-ink">عکس دوره</legend>
        {hasCover ? (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="removeCover" className="size-4 accent-primary" />
            عکس فعلی ثبت شده است؛ برای حذف آن تیک بزنید.
          </label>
        ) : null}
        <Field
          {...field('coverImage')}
          label={hasCover ? 'عکس جدید' : 'عکس'}
          defaultValue={undefined}
          hint="JPG، PNG یا WebP تا ۱۰ مگابایت؛ در فهرست دوره‌ها و بالای صفحهٔ دوره نمایش داده می‌شود. اگر فرم خطا داد، عکس را دوباره انتخاب کنید."
        >
          {(control) => <input {...control} type="file" accept="image/jpeg,image/png,image/webp" />}
        </Field>
        <TextField label="توضیح عکس (برای نابینایان)" {...field('coverAlt')} />
      </fieldset>
      <RichEditor
        key={state.status === 'error' ? state.values.description : 'initial'}
        name="description"
        label="توضیحات"
        required={false}
        initialHtml={(state.status === 'error' ? state.values.description : '') ?? ''}
        error={state.status === 'error' ? state.errors.description : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="مدرس" {...field('instructor')} />
        <TextField label="مکان" {...field('location')} />
        <TextField
          label="ظرفیت"
          type="number"
          hint="خالی یعنی بدون محدودیت"
          {...field('capacity')}
        />
      </div>
      <SessionRows state={state} legacyEnd={legacyEnd} />
      <fieldset className="space-y-4 rounded-control border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-brand-900">گواهی پایان دوره</legend>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            key={String(certificateEnabled)}
            type="checkbox"
            name="certificateEnabled"
            defaultChecked={certificateEnabled}
            className="size-4 accent-primary"
          />
          برای ثبت‌نام‌های «انجام شده» گواهی PDF صادر شود
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="نام امضاکننده"
            hint="اختیاری؛ زیر گواهی چاپ می‌شود."
            {...field('certificateSignatory')}
          />
          <TextField
            label="سمت امضاکننده"
            hint="مثلاً «مدیر مرکز»"
            {...field('certificateSignatoryTitle')}
          />
        </div>
        <p className="text-xs leading-6 text-ink-2">
          متن گواهی پیش‌نویس است تا مرکز متن، امضاکننده و اعتبار آن را تأیید کند (OQ-BD-16). هر
          گواهی یک شمارهٔ استعلام و کد QR دارد که در صفحهٔ /certificates بررسی می‌شود.
        </p>
      </fieldset>
      <SubmitButton>ذخیره</SubmitButton>
    </form>
  );
}
