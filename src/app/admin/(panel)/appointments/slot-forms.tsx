'use client';

import { useActionState } from 'react';
import { fieldState, FormMessage, SubmitButton, TextField } from '@/components/form-controls';
import { calendarCopy } from '@/content/site';
import { initialFormState, type FormState } from '@/lib/form-state';
import { addSlotAction, addSlotSeriesAction } from './actions';

/** One slot on one day. */
export function SingleSlotForm({ staffId }: { staffId: string }) {
  const [state, action] = useActionState(addSlotAction.bind(null, staffId), initialFormState);
  const field = (name: string) => fieldState(state, name);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-4">
        <TextField label="تاریخ" required hint="۱۴۰۵/۰۷/۱۵" {...field('date')} />
        <TextField label="ساعت شروع" required hint="۱۶:۳۰" {...field('startTime')} />
        <TextField
          label="مدت (دقیقه)"
          type="number"
          {...field('durationMinutes')}
          defaultValue={field('durationMinutes').defaultValue ?? '30'}
        />
        <TextField
          label="مکان یا توضیح"
          hint="مثلاً «دفتر مرکز» یا «تلفنی»"
          {...field('location')}
        />
      </div>
      <SubmitButton>افزودن نوبت</SubmitButton>
    </form>
  );
}

/** A weekly pattern: every selected weekday between two dates, split into equal slots. */
export function SlotSeriesForm({ staffId }: { staffId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    addSlotSeriesAction.bind(null, staffId),
    initialFormState,
  );
  const field = (name: string) => fieldState(state, name);
  const error = state.status === 'error' ? state.errors.weekdays : undefined;
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="از تاریخ" required hint="۱۴۰۵/۰۷/۱۵" {...field('fromDate')} />
        <TextField label="تا تاریخ" required hint="حداکثر یک سال" {...field('toDate')} />
        <TextField label="مکان یا توضیح" {...field('location')} />
        <TextField label="از ساعت" required hint="۰۹:۰۰" {...field('startTime')} />
        <TextField label="تا ساعت" required hint="۱۲:۰۰" {...field('endTime')} />
        <TextField
          label="مدت هر نوبت (دقیقه)"
          type="number"
          {...field('durationMinutes')}
          defaultValue={field('durationMinutes').defaultValue ?? '30'}
        />
      </div>
      <fieldset aria-describedby={error ? 'weekdays-error' : undefined}>
        <legend className="mb-2 text-sm font-medium text-ink">روزهای هفته</legend>
        <div className="flex flex-wrap gap-3">
          {calendarCopy.weekdays.map((day, index) => (
            <label key={day} className="flex items-center gap-1 text-sm text-ink">
              <input
                type="checkbox"
                name="weekdays"
                value={index}
                defaultChecked={index < 5}
                className="size-4 accent-primary"
              />
              {day}
            </label>
          ))}
        </div>
        {error ? (
          <p id="weekdays-error" className="mt-1 text-xs text-danger">
            {error}
          </p>
        ) : null}
      </fieldset>
      <SubmitButton>ساخت نوبت‌ها</SubmitButton>
    </form>
  );
}
