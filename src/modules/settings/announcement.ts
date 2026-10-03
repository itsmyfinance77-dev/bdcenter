import { createHash } from 'node:crypto';
import { z } from 'zod';
import { toPersianDigits } from '@/lib/format';
import { formatJalaliInput, jalaliDateTime } from '@/lib/jalali';
import { isSafeHref } from '@/lib/safe-href';
import { optionalText } from '@/lib/validation';
import { ANNOUNCEMENT_MAX } from './announcement-limits';

/**
 * The site-wide notice above the header of every public page (owner's
 * request, 2026-10-04, e.g. «مرکز تا ۱۵ فروردین تعطیل است»), set by an ADMIN in
 * «تنظیمات سایت». Stored in the `site.announcement` setting; dates are ISO
 * strings because settings are JSON.
 */

export const announcementSchema = z.object({
  enabled: z.boolean(),
  text: z.string().max(ANNOUNCEMENT_MAX),
  link: z.string().nullable(),
  linkLabel: z.string().nullable(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  tone: z.enum(['info', 'warning']),
});
export type Announcement = z.infer<typeof announcementSchema>;

export const noAnnouncement: Announcement = {
  enabled: false,
  text: '',
  link: null,
  linkLabel: null,
  startsAt: null,
  endsAt: null,
  tone: 'info',
};

export type ActiveAnnouncement = {
  text: string;
  link: string | null;
  linkLabel: string;
  tone: Announcement['tone'];
  /** Changes whenever the wording or link changes, so a closed notice comes back when edited. */
  key: string;
};

/** The notice to show at `now`, or null (off, empty, not started or ended). */
export function activeAnnouncement(
  value: Announcement,
  now = new Date(),
): ActiveAnnouncement | null {
  if (!value.enabled || !value.text.trim()) return null;
  if (value.startsAt && now < new Date(value.startsAt)) return null;
  if (value.endsAt && now >= new Date(value.endsAt)) return null;
  const key = createHash('sha256')
    .update(JSON.stringify([value.text, value.link, value.linkLabel, value.tone]))
    .digest('hex')
    .slice(0, 16);
  return {
    text: value.text,
    link: value.link,
    linkLabel: value.linkLabel || 'اطلاعات بیشتر',
    tone: value.tone,
    key,
  };
}

/** The «نوار اطلاعیه» form: the checkbox arrives as "on" or not at all. */
export const announcementInputSchema = z
  .object({
    enabled: z.preprocess((value) => value === 'on', z.boolean()),
    text: optionalText('متن اطلاعیه', ANNOUNCEMENT_MAX),
    link: optionalText('پیوند', 500).refine((value) => !value || isSafeHref(value), {
      message: 'نشانی باید با / (صفحه‌ای از همین سایت) یا https:// شروع شود.',
    }),
    linkLabel: optionalText('متن پیوند', 30),
    startsAt: jalaliDateTime('زمان شروع نمایش'),
    endsAt: jalaliDateTime('زمان پایان نمایش'),
    tone: z.enum(['info', 'warning']),
  })
  .superRefine((value, ctx) => {
    if (value.enabled && !value.text) {
      ctx.addIssue({ code: 'custom', path: ['text'], message: 'متن اطلاعیه را بنویسید.' });
    }
    if (value.linkLabel && !value.link) {
      ctx.addIssue({ code: 'custom', path: ['link'], message: 'نشانی پیوند را بنویسید.' });
    }
    if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'زمان پایان باید بعد از زمان شروع باشد.',
      });
    }
  })
  .transform((value): Announcement => ({
    enabled: value.enabled,
    text: value.text ?? '',
    link: value.link ?? null,
    linkLabel: value.linkLabel ?? null,
    startsAt: value.startsAt?.toISOString() ?? null,
    endsAt: value.endsAt?.toISOString() ?? null,
    tone: value.tone,
  }));

/** Form values for the stored notice. */
export function announcementFormValues(value: Announcement): Record<string, string> {
  return {
    enabled: value.enabled ? 'on' : '',
    text: value.text,
    link: value.link ?? '',
    linkLabel: value.linkLabel ?? '',
    startsAt: value.startsAt ? toPersianDigits(formatJalaliInput(new Date(value.startsAt))) : '',
    endsAt: value.endsAt ? toPersianDigits(formatJalaliInput(new Date(value.endsAt))) : '',
    tone: value.tone,
  };
}
