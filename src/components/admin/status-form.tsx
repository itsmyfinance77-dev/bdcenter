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
      <label className="sr-only" htmlFor="status">
        وضعیت
      </label>
      <select
        id="status"
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
      <button type="submit" className={secondaryButtonClass}>
        ثبت وضعیت
      </button>
    </form>
  );
}
