import { calendarCopy } from '@/content/site';
import { subscriptionLinks } from '@/lib/calendar-links';

const buttonClass =
  'inline-flex min-h-11 items-center rounded-control border border-line bg-white px-4 py-2 text-sm font-medium text-primary hover:border-line-hover';

/** One-click subscriptions to an .ics feed in the common calendar apps. */
export function CalendarSubscribe({ feedUrl, name }: { feedUrl: string; name: string }) {
  const links = subscriptionLinks(feedUrl, name);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <a href={links.google} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          {calendarCopy.subscribeGoogle}
        </a>
        <a href={links.webcal} className={buttonClass}>
          {calendarCopy.subscribeApple}
        </a>
        <a href={links.outlook} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          {calendarCopy.subscribeOutlook}
        </a>
      </div>
      <p className="text-xs leading-6 text-ink-2">{calendarCopy.subscribeCopy}</p>
      <input
        readOnly
        value={links.feed}
        dir="ltr"
        aria-label="نشانی تقویم"
        className="w-full rounded-control border border-line bg-surface px-3 py-2 text-xs text-ink"
      />
      <p className="text-xs leading-6 text-ink-2">{calendarCopy.subscribeNote}</p>
    </div>
  );
}
