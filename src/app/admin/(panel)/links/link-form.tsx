'use client';

import { useActionState } from 'react';
import { secondaryButtonClass } from '@/components/admin/ui';
import type { FormState } from '@/lib/form-state';
import { saveLinkAction } from './actions';

const inputClass =
  'w-full rounded-control border border-line bg-white px-2 py-1.5 text-sm aria-invalid:border-danger';

/** One inline row: title, address, order. Used for editing and for adding a link. */
export function LinkForm({
  id,
  section,
  initial,
}: {
  id: string | null;
  section: string;
  initial: { title: string; url: string; sortOrder: string };
}) {
  const [state, action] = useActionState<FormState, FormData>(saveLinkAction.bind(null, id), {
    status: 'idle',
  });
  const values = state.status === 'error' ? state.values : undefined;
  const errors = state.status === 'error' ? state.errors : {};
  const value = (name: 'title' | 'url' | 'sortOrder') => values?.[name] ?? initial[name];
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_5rem_auto]">
      <input type="hidden" name="section" value={section} />
      <label>
        <span className="sr-only">عنوان</span>
        <input
          name="title"
          defaultValue={value('title')}
          placeholder="عنوان"
          aria-invalid={errors.title ? true : undefined}
          className={inputClass}
        />
      </label>
      <label>
        <span className="sr-only">نشانی</span>
        <input
          name="url"
          dir="ltr"
          defaultValue={value('url')}
          placeholder="https://..."
          aria-invalid={errors.url ? true : undefined}
          className={inputClass}
        />
      </label>
      <label>
        <span className="sr-only">ترتیب</span>
        <input
          name="sortOrder"
          inputMode="numeric"
          defaultValue={value('sortOrder')}
          placeholder="ترتیب"
          aria-invalid={errors.sortOrder ? true : undefined}
          className={inputClass}
        />
      </label>
      <button type="submit" className={secondaryButtonClass}>
        {id ? 'ذخیره' : 'افزودن'}
      </button>
      {state.status !== 'idle' ? (
        <p
          role="status"
          className={`text-xs sm:col-span-4 ${state.status === 'success' ? 'text-success' : 'text-danger'}`}
        >
          {state.status === 'error'
            ? (errors.title ?? errors.url ?? errors.sortOrder ?? state.message)
            : state.message}
        </p>
      ) : null}
    </form>
  );
}
