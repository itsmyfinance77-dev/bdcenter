import { calendarCopy } from '@/content/site';
import { googleCalendarEventUrl, type LinkEvent } from '@/lib/calendar-links';

const buttonClass =
  'inline-block rounded-control border border-line bg-white px-4 py-2 font-medium text-primary hover:border-line-hover';

/**
 * Adds one event to the visitor's calendar: the .ics download opens in the
 * phone's own calendar app; the Google link adds it to Google Calendar directly.
 */
export function AddToCalendar({ href, event }: { href: string; event: LinkEvent }) {
  return (
    <div className="text-sm">
      <div className="flex flex-wrap gap-2">
        <a href={href} download className={buttonClass}>
          {calendarCopy.addToCalendar}
        </a>
        <a
          href={googleCalendarEventUrl(event)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
        >
          {calendarCopy.addToGoogle}
        </a>
      </div>
      <span className="mt-1 block text-xs leading-6 text-ink-2">
        {calendarCopy.addToCalendarHint}
      </span>
    </div>
  );
}
