import { requestStatusLabel } from '@/content/admin';
import { notifyCopy } from '@/content/notifications';
import { surveyCopy } from '@/content/surveys';
import { secondaryButtonClass } from './ui';

/**
 * Select + submit for moving a request between statuses. Works without client
 * JS. With `notify`, a checkbox (on by default) lets staff tell the applicant;
 * with `survey`, another one sends the satisfaction survey when it becomes DONE.
 */
export function StatusForm({
  action,
  current,
  notify = false,
  survey = false,
}: {
  action: (formData: FormData) => Promise<void>;
  current: keyof typeof requestStatusLabel;
  notify?: boolean;
  survey?: boolean;
}) {
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {/* Wrapping label instead of a fixed id: a page can list many of these forms. */}
      <label>
        <span className="sr-only">وضعیت</span>
        {/* key: React ignores a changed defaultValue on <select> after mount, and the
            form reset after the action would otherwise show the old status. */}
        <select
          key={current}
          name="status"
          defaultValue={current}
          className="rounded-control border border-line bg-white px-2 py-1.5 text-sm"
        >
          {Object.entries(requestStatusLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className={secondaryButtonClass}>
        ثبت وضعیت
      </button>
      {notify ? (
        <label className="flex items-center gap-1 text-xs text-ink-2">
          <input
            key={current}
            type="checkbox"
            name="notify"
            defaultChecked
            className="size-3.5 accent-primary"
          />
          {notifyCopy.checkbox}
        </label>
      ) : null}
      {survey ? (
        <label className="flex items-center gap-1 text-xs text-ink-2">
          <input
            key={current}
            type="checkbox"
            name="survey"
            defaultChecked
            className="size-3.5 accent-primary"
          />
          {surveyCopy.checkbox}
        </label>
      ) : null}
    </form>
  );
}
