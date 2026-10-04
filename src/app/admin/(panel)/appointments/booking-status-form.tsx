import { secondaryButtonClass } from '@/components/admin/ui';
import { bookingStatusLabel } from '@/content/appointments';
import { notifyCopy } from '@/content/notifications';
import { surveyCopy } from '@/content/surveys';

/** Select + submit for a booking's status; works without client JS. */
export function BookingStatusForm({
  action,
  current,
}: {
  action: (formData: FormData) => Promise<void>;
  current: keyof typeof bookingStatusLabel;
}) {
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <label>
        <span className="sr-only">وضعیت</span>
        {/* key: remount so a changed status shows after the form resets. */}
        <select
          key={current}
          name="status"
          defaultValue={current}
          className="rounded-control border border-line bg-white px-2 py-1.5 text-sm"
        >
          {Object.entries(bookingStatusLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className={secondaryButtonClass}>
        ثبت
      </button>
      <label className="flex items-center gap-1 text-xs text-ink-2">
        <input
          key={current}
          type="checkbox"
          name="notify"
          defaultChecked
          className="size-3.5 accent-primary"
        />
        {notifyCopy.checkbox} (هنگام لغو)
      </label>
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
    </form>
  );
}
