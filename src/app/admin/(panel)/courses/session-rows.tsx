'use client';

import { useState } from 'react';
import { TextField } from '@/components/form-controls';
import { secondaryButtonClass } from '@/components/admin/ui';
import type { FormState } from '@/lib/form-state';
import { MAX_SESSIONS } from '@/modules/training/sessions';

const digits = new Intl.NumberFormat('fa-IR');
const FIELDS = ['date', 'start', 'end', 'location', 'topic'] as const;
type Row = { key: number; defaults: Record<string, string>; errors: Record<string, string> };

let nextKey = 0;

/** Rows from submitted or stored values (`s0date`, `s0start`, …); at least one. */
function rowsFrom(state: FormState): Row[] {
  const values = state.status === 'error' ? state.values : {};
  const errors = state.status === 'error' ? state.errors : {};
  let count = 1;
  for (const key of Object.keys(values)) {
    const match = /^s(\d+)(?:date|start|end|location|topic)$/.exec(key);
    if (match) count = Math.max(count, Number(match[1]) + 1);
  }
  return Array.from({ length: Math.min(count, MAX_SESSIONS) }, (_, i) => ({
    key: nextKey++,
    defaults: Object.fromEntries(FIELDS.map((f) => [f, values[`s${i}${f}`] ?? ''])),
    errors: Object.fromEntries(FIELDS.map((f) => [f, errors[`s${i}${f}`] ?? ''])),
  }));
}

/**
 * The course's sessions as numbered rows. Each row keeps its own values, so
 * removing one leaves the others as they are; after every save attempt the
 * rows are rebuilt from what was sent. The server sorts sessions by start, so
 * the order here does not matter.
 */
export function SessionRows({ state }: { state: FormState }) {
  const [rows, setRows] = useState(() => rowsFrom(state));
  const [shown, setShown] = useState(state);
  if (shown !== state) {
    // A new action result: show exactly what was submitted, with its errors.
    setShown(state);
    setRows(rowsFrom(state));
  }
  const general = state.status === 'error' ? state.errors._sessions : undefined;

  return (
    <fieldset className="space-y-4 rounded-control border border-line p-4">
      <legend className="px-1 text-sm font-semibold text-brand-900">جلسه‌های دوره</legend>
      <p className="text-xs leading-6 text-ink-2">
        برای هر جلسه تاریخ و ساعت شروع را بنویسید (مثلاً ۱۴۰۵/۰۸/۰۱ و ۱۶:۰۰). ساعت پایان، مکان و
        موضوع اختیاری‌اند؛ مکان خالی یعنی همان مکان دوره. زمان شروع و پایان دوره از اولین و آخرین
        جلسه گرفته می‌شود.
      </p>
      {general ? <p className="text-sm font-semibold text-danger">{general}</p> : null}
      {rows.map((row, i) => {
        const field = (name: (typeof FIELDS)[number]) => ({
          name: `s${i}${name}`,
          defaultValue: row.defaults[name],
          error: row.errors[name] || undefined,
        });
        return (
          <div key={row.key} className="space-y-3 rounded-card border border-line bg-surface p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">جلسهٔ {digits.format(i + 1)}</p>
              {rows.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                  className="text-sm text-danger hover:underline"
                >
                  حذف این جلسه
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField label="تاریخ" hint="۱۴۰۵/۰۸/۰۱" {...field('date')} />
              <TextField label="ساعت شروع" hint="۱۶:۰۰" {...field('start')} />
              <TextField label="ساعت پایان" hint="اختیاری" {...field('end')} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="مکان این جلسه" hint="اختیاری" {...field('location')} />
              <TextField label="موضوع این جلسه" hint="اختیاری" {...field('topic')} />
            </div>
          </div>
        );
      })}
      {rows.length < MAX_SESSIONS ? (
        <button
          type="button"
          onClick={() =>
            setRows((current) => [...current, { key: nextKey++, defaults: {}, errors: {} }])
          }
          className={secondaryButtonClass}
        >
          افزودن جلسه
        </button>
      ) : null}
    </fieldset>
  );
}
