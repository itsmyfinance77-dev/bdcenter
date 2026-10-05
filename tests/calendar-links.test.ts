import { describe, expect, it } from 'vitest';
import { googleCalendarEventUrl, subscriptionLinks } from '@/lib/calendar-links';

describe('calendar links', () => {
  it('prefills a Google Calendar event in UTC', () => {
    const url = new URL(
      googleCalendarEventUrl({
        title: 'دوره بازاریابی',
        startsAt: new Date('2026-10-10T06:30:00Z'),
        location: 'دفتر مرکز',
        description: 'جلسه اول',
        url: 'https://ccinno.center/courses/x',
      }),
    );
    expect(url.origin).toBe('https://calendar.google.com');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('دوره بازاریابی');
    // Without an end time the event lasts one hour.
    expect(url.searchParams.get('dates')).toBe('20261010T063000Z/20261010T073000Z');
    expect(url.searchParams.get('location')).toBe('دفتر مرکز');
    expect(url.searchParams.get('details')).toContain('https://ccinno.center/courses/x');
  });

  it('builds subscription links for Google, Apple and Outlook', () => {
    const links = subscriptionLinks('https://ccinno.center/calendar.ics', 'مرکز');
    expect(links.webcal).toBe('webcal://ccinno.center/calendar.ics');
    expect(new URL(links.google).searchParams.get('cid')).toBe(links.webcal);
    expect(new URL(links.outlook).searchParams.get('url')).toBe(links.feed);
  });
});
