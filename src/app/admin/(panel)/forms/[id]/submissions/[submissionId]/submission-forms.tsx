'use client';

import { useActionState } from 'react';
import { fieldState, FormMessage, TextareaField } from '@/components/form-controls';
import { secondaryButtonClass } from '@/components/admin/ui';
import { actionResultKey, initialFormState, type FormState } from '@/lib/form-state';

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/** «مسئول پیگیری»: one of the active staff accounts, or nobody. */
export function AssignForm({
  action,
  current,
  staff,
}: {
  action: Action;
  current: string | null;
  staff: { id: string; fullName: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="assignee" className="text-sm font-semibold text-ink">
          مسئول پیگیری
        </label>
        {/* key: show the saved choice again after React resets the form. */}
        <select
          key={`${current}-${actionResultKey(state)}`}
          id="assignee"
          name="assignee"
          defaultValue={current ?? ''}
          className="rounded-control border border-line bg-white px-2 py-1.5 text-sm"
        >
          <option value="">بدون مسئول</option>
          {staff.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.fullName}
            </option>
          ))}
        </select>
        <button type="submit" disabled={pending} className={secondaryButtonClass}>
          ثبت مسئول
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

/** A new staff note; never shown to the applicant. */
export function NoteForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="space-y-3">
      <FormMessage state={state} />
      <TextareaField
        key={actionResultKey(state)}
        label="یادداشت تازه"
        rows={3}
        hint="فقط کارمندان می‌بینند؛ برای متقاضی فرستاده نمی‌شود."
        {...fieldState(state, 'body')}
        name="body"
      />
      <button type="submit" disabled={pending} className={secondaryButtonClass}>
        ثبت یادداشت
      </button>
    </form>
  );
}
