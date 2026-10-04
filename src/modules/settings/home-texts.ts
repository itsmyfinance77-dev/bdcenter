import { z } from 'zod';
import { homeCopy, siteInfo } from '@/content/site';

/**
 * The home page's own texts an ADMIN may change in «تنظیمات سایت» (owner's
 * request, 2026-10-04): the hero badge, title, subtitle and lead, and the
 * about section's kicker and title. An empty value means "use the built-in
 * text" (src/content/site.ts), so clearing a field restores the design's copy.
 */

export const HOME_TEXT_KEYS = [
  'heroBadge',
  'heroTitle',
  'heroSubtitle',
  'heroLead',
  'aboutKicker',
  'aboutTitle',
] as const;
export type HomeTextKey = (typeof HOME_TEXT_KEYS)[number];
export type HomeTexts = Record<HomeTextKey, string>;

/** The built-in texts, shown while nothing is saved. */
export const defaultHomeTexts: HomeTexts = {
  heroBadge: homeCopy.heroBadge,
  heroTitle: siteInfo.name,
  heroSubtitle: siteInfo.parentOrg,
  heroLead: homeCopy.heroLead,
  aboutKicker: homeCopy.aboutKicker,
  aboutTitle: homeCopy.aboutTitle,
};

/**
 * Per field: what the design was drawn for (`fits`, longer texts wrap onto
 * more lines and the form warns) and a hard limit (`max`).
 */
export const homeTextLimits: Record<HomeTextKey, { fits: number; max: number }> = {
  heroBadge: { fits: 32, max: 60 },
  heroTitle: { fits: 30, max: 60 },
  heroSubtitle: { fits: 60, max: 120 },
  heroLead: { fits: 140, max: 280 },
  aboutKicker: { fits: 24, max: 50 },
  aboutTitle: { fits: 24, max: 50 },
};

export const homeTextLabels: Record<HomeTextKey, string> = {
  heroBadge: 'برچسب بالای عنوان',
  heroTitle: 'عنوان اصلی',
  heroSubtitle: 'زیرعنوان',
  heroLead: 'جملهٔ معرفی',
  aboutKicker: 'برچسب کوچک بخش «درباره مرکز» (روی عکس هم می‌آید)',
  aboutTitle: 'عنوان بخش «درباره مرکز»',
};

/** Stored value: only the fields that differ from the built-in text. */
export const homeTextsSchema = z.object(
  Object.fromEntries(HOME_TEXT_KEYS.map((key) => [key, z.string().optional()])) as Record<
    HomeTextKey,
    z.ZodOptional<z.ZodString>
  >,
);
export type StoredHomeTexts = z.infer<typeof homeTextsSchema>;

/** The texts to show: saved ones over the built-in ones. */
export function resolveHomeTexts(stored: StoredHomeTexts): HomeTexts {
  return Object.fromEntries(
    HOME_TEXT_KEYS.map((key) => [key, stored[key]?.trim() || defaultHomeTexts[key]]),
  ) as HomeTexts;
}

/**
 * Reads the «متن‌های صفحهٔ اصلی» form. A field left empty, or equal to the
 * built-in text, is not stored, so a later change of the built-in copy shows.
 */
export function parseHomeTexts(values: Record<string, string>) {
  const stored: StoredHomeTexts = {};
  const errors: Record<string, string> = {};
  for (const key of HOME_TEXT_KEYS) {
    const text = (values[key] ?? '').replace(/\s+/g, ' ').trim();
    if (text.length > homeTextLimits[key].max) {
      errors[key] =
        `حداکثر ${new Intl.NumberFormat('fa-IR').format(homeTextLimits[key].max)} نویسه.`;
    } else if (text && text !== defaultHomeTexts[key]) {
      stored[key] = text;
    }
  }
  return { stored, errors };
}
