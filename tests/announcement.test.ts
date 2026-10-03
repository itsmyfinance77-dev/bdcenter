import { describe, expect, it } from 'vitest';
import {
  activeAnnouncement,
  announcementFormValues,
  announcementInputSchema,
  noAnnouncement,
  type Announcement,
} from '@/modules/settings/announcement';

const notice: Announcement = {
  ...noAnnouncement,
  enabled: true,
  text: 'مرکز تا ۱۵ فروردین تعطیل است.',
};

describe('site notice', () => {
  it('shows only while on, non-empty and inside its dates', () => {
    const now = new Date('2026-10-05T08:00:00Z');
    expect(activeAnnouncement(notice, now)).toMatchObject({
      text: notice.text,
      linkLabel: 'اطلاعات بیشتر',
      tone: 'info',
    });
    expect(activeAnnouncement({ ...notice, enabled: false }, now)).toBeNull();
    expect(activeAnnouncement({ ...notice, text: '  ' }, now)).toBeNull();
    const future = { ...notice, startsAt: '2026-10-06T00:00:00.000Z' };
    expect(activeAnnouncement(future, now)).toBeNull();
    expect(activeAnnouncement(future, new Date('2026-10-06T00:00:00Z'))).not.toBeNull();
    const ended = { ...notice, endsAt: '2026-10-05T08:00:00.000Z' };
    expect(activeAnnouncement(ended, now)).toBeNull();
  });

  it('gets a new key when the wording or link changes, not when only the dates do', () => {
    const now = new Date('2026-10-05T08:00:00Z');
    const key = activeAnnouncement(notice, now)!.key;
    expect(key).toMatch(/^[0-9a-f]{16}$/);
    expect(activeAnnouncement({ ...notice, endsAt: '2027-01-01T00:00:00.000Z' }, now)!.key).toBe(
      key,
    );
    expect(activeAnnouncement({ ...notice, text: 'متن دیگر' }, now)!.key).not.toBe(key);
    expect(activeAnnouncement({ ...notice, link: '/news' }, now)!.key).not.toBe(key);
  });

  it('reads the settings form, with Jalali dates', () => {
    const parsed = announcementInputSchema.parse({
      enabled: 'on',
      text: ' مرکز تعطیل است. ',
      link: '/news',
      linkLabel: '',
      startsAt: '۱۴۰۵/۰۷/۱۵ ۰۸:۰۰',
      endsAt: '1405/07/20 18:30',
      tone: 'warning',
    });
    expect(parsed).toEqual({
      enabled: true,
      text: 'مرکز تعطیل است.',
      link: '/news',
      linkLabel: null,
      // 08:00 Tehran = 04:30 UTC.
      startsAt: '2026-10-07T04:30:00.000Z',
      endsAt: '2026-10-12T15:00:00.000Z',
      tone: 'warning',
    });
    expect(announcementFormValues(parsed)).toMatchObject({
      enabled: 'on',
      startsAt: '۱۴۰۵/۰۷/۱۵ ۰۸:۰۰',
    });
  });

  it('refuses a notice without text, bad links and reversed dates', () => {
    const base = { tone: 'info' };
    const errors = (values: Record<string, string>) => {
      const result = announcementInputSchema.safeParse({ ...base, ...values });
      return result.success ? [] : result.error.issues.map((issue) => issue.path[0]);
    };
    expect(errors({ enabled: 'on' })).toEqual(['text']);
    expect(errors({})).toEqual([]); // off and empty is fine
    expect(errors({ text: 'x', link: 'javascript:alert(1)' })).toEqual(['link']);
    expect(errors({ text: 'x', link: '//evil.example' })).toEqual(['link']);
    expect(errors({ text: 'x', linkLabel: 'بیشتر' })).toEqual(['link']);
    expect(errors({ text: 'x', startsAt: '1405/07/20 08:00', endsAt: '1405/07/15 08:00' })).toEqual(
      ['endsAt'],
    );
    expect(errors({ text: 'x'.repeat(201) })).toEqual(['text']);
    expect(errors({ text: 'x', tone: 'red' })).toEqual(['tone']);
  });
});
