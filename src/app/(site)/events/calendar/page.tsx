import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { calendarCopy } from '@/content/site';
import { formatDateTime, formatNumber } from '@/lib/format';
import { formatJalaliMonthParam, parseJalaliMonth, type JalaliMonth } from '@/lib/jalali';
import { currentJalaliMonth, getMonthGrid } from '@/modules/calendar/service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: calendarCopy.title,
  description: calendarCopy.lead,
  alternates: { canonical: '/events/calendar' },
};

function monthHref(month: JalaliMonth) {
  return `/events/calendar?month=${formatJalaliMonthParam(month)}`;
}

const kindTone = {
  event: 'bg-primary/10 text-primary',
  course: 'bg-success/10 text-success',
} as const;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const requested = parseJalaliMonth((await searchParams).month);
  const current = currentJalaliMonth();
  const grid = await getMonthGrid(requested ?? current);
  const feedUrl = new URL(
    '/calendar.ics',
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  ).toString();

  return (
    <>
      <PageHeader
        title={calendarCopy.title}
        lead={calendarCopy.lead}
        crumbs={[{ title: 'رویدادها', href: '/events' }, { title: calendarCopy.title }]}
      />
      <div className="mx-auto max-w-(--container-page) space-y-8 px-4 py-12">
        <nav
          aria-label="ماه‌ها"
          className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-white px-4 py-3"
        >
          <Link href={monthHref(grid.previous)} className="text-sm text-primary hover:underline">
            → {calendarCopy.previous}
          </Link>
          <h2 className="text-lg font-bold text-brand-900" aria-live="polite">
            {calendarCopy.months[grid.month.month - 1]} {formatNumber(grid.month.year)}
          </h2>
          <div className="flex items-center gap-4 text-sm">
            {grid.month.year !== current.year || grid.month.month !== current.month ? (
              <Link href="/events/calendar" className="text-ink-2 hover:underline">
                {calendarCopy.thisMonth}
              </Link>
            ) : null}
            <Link href={monthHref(grid.next)} className="text-primary hover:underline">
              {calendarCopy.next} ←
            </Link>
          </div>
        </nav>

        <div className="overflow-hidden rounded-panel border border-line bg-white">
          <div
            className="grid grid-cols-7 border-b border-line bg-surface-2 text-center text-xs text-ink-2"
            aria-hidden="true"
          >
            {calendarCopy.weekdays.map((day) => (
              <div key={day} className="px-1 py-2">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.slice(0, 1)}</span>
              </div>
            ))}
          </div>
          {/* The grid is a visual aid; the list below carries the same information for screen readers. */}
          <div className="grid grid-cols-7" aria-hidden="true">
            {Array.from({ length: grid.leadingBlanks }, (_, i) => (
              <div
                key={`blank-${i}`}
                className="min-h-16 border-b border-s border-line sm:min-h-24"
              />
            ))}
            {grid.days.map((day) => (
              <div
                key={day.day}
                className={`min-h-16 border-b border-s border-line p-1 sm:min-h-24 sm:p-2 ${
                  day.isToday ? 'bg-primary/5' : ''
                }`}
              >
                <span
                  className={`text-xs ${
                    day.isToday
                      ? 'rounded-chip bg-primary px-1.5 py-0.5 font-bold text-white'
                      : 'text-ink-2'
                  }`}
                >
                  {formatNumber(day.day)}
                </span>
                <ul className="mt-1 space-y-1">
                  {day.items.map((item) => (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        tabIndex={-1}
                        className={`block truncate rounded-chip px-1 py-0.5 text-[11px] leading-4 sm:text-xs ${kindTone[item.kind]}`}
                        title={item.title}
                      >
                        <span className="hidden sm:inline">{item.title}</span>
                        <span className="sm:hidden">•</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <section aria-labelledby="month-list" className="space-y-3">
          <h2 id="month-list" className="text-lg font-bold text-brand-900">
            {calendarCopy.monthList}
          </h2>
          {grid.items.length === 0 ? (
            <p className="text-sm text-ink-2">{calendarCopy.empty}</p>
          ) : (
            <ul className="divide-y divide-line rounded-panel border border-line bg-white">
              {grid.items.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="flex gap-3 px-5 py-4 hover:bg-surface-2">
                    <span
                      className={`h-fit shrink-0 rounded-chip px-2 py-0.5 text-xs ${kindTone[item.kind]}`}
                    >
                      {calendarCopy.kind[item.kind]}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{item.title}</span>
                      <span className="block text-xs text-ink-2">
                        <time dateTime={item.startsAt.toISOString()}>
                          {formatDateTime(item.startsAt)}
                        </time>
                        {item.location ? ` · ${item.location}` : null}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="subscribe-heading"
          className="rounded-panel border border-line bg-white p-5 text-sm"
        >
          <h2 id="subscribe-heading" className="font-semibold text-ink">
            {calendarCopy.subscribe}
          </h2>
          <p className="mt-1 text-ink-2">{calendarCopy.subscribeHint}</p>
          <p className="mt-2">
            <a href="/calendar.ics" dir="ltr" className="text-primary hover:underline">
              {feedUrl}
            </a>
          </p>
        </section>
      </div>
    </>
  );
}
