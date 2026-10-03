import { icalDate } from './ical';

/**
 * Direct links into people's calendars (owner's request, 2026-10-03): one
 * event straight into Google Calendar, and live subscriptions to an .ics feed
 * from Google Calendar, Apple Calendar (webcal) and Outlook. Subscribed
 * calendars refresh on their own, so new events and bookings appear without
 * downloading anything.
 */

export type LinkEvent = {
  title: string;
  startsAt: Date;
  endsAt?: Date | null;
  location?: string | null;
  description?: string | null;
  url?: string | null;
};

/** Events without an end time are shown as one hour long, like the .ics files. */
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

/** Google Calendar's "add event" page, prefilled. */
export function googleCalendarEventUrl(event: LinkEvent): string {
  const end = event.endsAt ?? new Date(event.startsAt.getTime() + DEFAULT_DURATION_MS);
  const details = [event.description, event.url].filter(Boolean).join('\n\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${icalDate(event.startsAt)}/${icalDate(end)}`,
    ctz: 'Asia/Tehran',
  });
  if (details) params.set('details', details);
  if (event.location) params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}

export type SubscriptionLinks = {
  /** The feed itself, to copy into any calendar app. */
  feed: string;
  /** Apple Calendar (iPhone, Mac) and desktop Outlook open webcal:// links as subscriptions. */
  webcal: string;
  google: string;
  outlook: string;
};

export function subscriptionLinks(feedUrl: string, name: string): SubscriptionLinks {
  const webcal = feedUrl.replace(/^https?:/, 'webcal:');
  return {
    feed: feedUrl,
    webcal,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?${new URLSearchParams({ url: feedUrl, name })}`,
  };
}
