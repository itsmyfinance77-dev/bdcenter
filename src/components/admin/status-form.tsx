import { requestStatusLabel } from '@/content/admin';
import { secondaryButtonClass } from './ui';

/** Select + submit for moving a request between statuses. Works without client JS. */
export function StatusForm({
  action,
  current,
}: {
  action: (formData: FormData) => Promise<void>;
  current: keyof typeof requestStatusLabel;
}) {
  return (
    <form action={action} className="flex items-center gap-2">
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
    </form>
  );
}
