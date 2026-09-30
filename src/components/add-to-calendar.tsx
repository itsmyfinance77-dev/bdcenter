import { calendarCopy } from '@/content/site';

/** Download link for a single item's .ics; phones open it in their calendar app. */
export function AddToCalendar({ href }: { href: string }) {
  return (
    <p className="text-sm">
      <a
        href={href}
        download
        className="inline-block rounded-control border border-line bg-white px-4 py-2 font-medium text-primary hover:border-line-hover"
      >
        {calendarCopy.addToCalendar}
      </a>
      <span className="mt-1 block text-xs text-ink-2">{calendarCopy.addToCalendarHint}</span>
    </p>
  );
}
