import { z } from 'zod';
import { menuIconLabel } from '@/content/admin';
import { mainNav, servicesMenu, siteInfo } from '@/content/site';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/modules/audit/service';
import {
  activeAnnouncement,
  announcementSchema,
  noAnnouncement,
  type ActiveAnnouncement,
} from './announcement';

/**
 * Small switches and texts an ADMIN can change from the panel, stored as one
 * JSON value per key in `site_settings`. Each setting has a typed default, so
 * a missing (or malformed) row simply means "not changed yet".
 */

export const MAX_SERVICE_ITEMS = 12;
export const MAX_MAIN_ITEMS = 6;

const contactSchema = z.object({
  address: z.string(),
  postalCode: z.string().nullable(),
  phone: z.string(),
  phoneExtension: z.string().nullable(),
  email: z.string().nullable(),
});
export type ContactInfo = z.infer<typeof contactSchema>;

/** Kinds of new requests staff can be told about (owner's request, 2026-10-03). */
export const ALERT_KINDS = ['consulting', 'forms', 'contact', 'enrollments', 'members'] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

const recipientsSchema = z.object({ phones: z.array(z.string()), emails: z.array(z.string()) });
export type AlertRecipients = z.infer<typeof recipientsSchema>;
const alertsSchema = z.record(z.enum(ALERT_KINDS), recipientsSchema);

const statsSchema = z.array(z.object({ label: z.string(), value: z.string() })).max(4);
export type HomeStat = z.infer<typeof statsSchema>[number];

const menuItemSchema = z.object({ title: z.string(), href: z.string() });
const menuSchema = z.object({
  services: z.array(menuItemSchema.extend({ icon: z.string() })).max(MAX_SERVICE_ITEMS),
  main: z.array(menuItemSchema).max(MAX_MAIN_ITEMS),
});
export type SiteMenu = z.infer<typeof menuSchema>;

const defaultMenu: SiteMenu = {
  services: servicesMenu.map(({ title, href, icon }) => ({ title, href, icon })),
  main: mainNav.map(({ title, href }) => ({ title, href })),
};

const definitions = {
  /** Members must upload an image of their national card (owner's request: optional until an ADMIN decides). */
  'members.nationalCardRequired': { schema: z.boolean(), fallback: false },
  /** The center's contact details shown in the footer, contact page and structured data. */
  'site.contact': { schema: contactSchema, fallback: { ...siteInfo.contact } as ContactInfo },
  /**
   * «مرکز در یک نگاه» figures on the home page (OQ-BD-18): real numbers the
   * center enters; the band stays hidden while the list is empty.
   */
  'home.stats': { schema: statsSchema, fallback: [] as HomeStat[] },
  /** Notice above the header of every public page (owner's request, 2026-10-04). */
  'site.announcement': { schema: announcementSchema, fallback: noAnnouncement },
  /** The header: the «خدمات» dropdown and the top-level links (owner's request, 2026-10-03). */
  'site.menu': { schema: menuSchema, fallback: defaultMenu },
  /** Who hears (SMS / email) about each kind of new request. */
  'alerts.recipients': {
    schema: alertsSchema,
    fallback: {} as Partial<Record<AlertKind, AlertRecipients>>,
  },
} as const;

export type SettingKey = keyof typeof definitions;
type SettingValue<K extends SettingKey> = z.infer<(typeof definitions)[K]['schema']>;

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  const parsed = definitions[key].schema.safeParse(row?.value);
  return (parsed.success ? parsed.data : definitions[key].fallback) as SettingValue<K>;
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: SettingValue<K>,
  actorId: string,
) {
  const checked = definitions[key].schema.parse(value);
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: checked },
    update: { value: checked },
  });
  await recordAudit({
    actorId,
    action: 'setting.update',
    entity: 'SiteSetting',
    entityId: key,
    metadata: { value: checked },
  });
}

/**
 * The center's contact details, for public pages. Falls back to the approved
 * copy when the database is unreachable, so the footer never breaks a page.
 */
export async function getContactInfo(): Promise<ContactInfo> {
  try {
    return await getSetting('site.contact');
  } catch (error) {
    console.error('getContactInfo: using the built-in contact details', error);
    return { ...siteInfo.contact };
  }
}

// ---------------------------------------------------------------------------
// Admin input
// ---------------------------------------------------------------------------

const blank = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;
const optional = (label: string, max: number) =>
  z.preprocess(blank, z.string().trim().max(max, `${label} بیش از حد طولانی است.`).optional());

export const contactInputSchema = z.object({
  address: z.preprocess(
    blank,
    z
      .string({ required_error: 'نشانی را وارد کنید.' })
      .trim()
      .max(300, 'نشانی بیش از حد طولانی است.'),
  ),
  phone: z.preprocess(
    blank,
    z
      .string({ required_error: 'تلفن را وارد کنید.' })
      .trim()
      .regex(/^[0-9۰-۹+\-\s()]{5,30}$/, 'تلفن معتبر نیست.'),
  ),
  phoneExtension: optional('داخلی', 20),
  email: z.preprocess(blank, z.string().trim().email('ایمیل معتبر نیست.').max(200).optional()),
  postalCode: optional('کد پستی', 20),
});

export async function saveContactInfo(input: z.infer<typeof contactInputSchema>, actorId: string) {
  await setSetting(
    'site.contact',
    {
      address: input.address,
      phone: input.phone,
      phoneExtension: input.phoneExtension ?? null,
      email: input.email ?? null,
      postalCode: input.postalCode ?? null,
    },
    actorId,
  );
}

/**
 * Splits one text box of recipients (mobile numbers and emails, separated by
 * new lines, commas or spaces) into phones and emails; returns what it could
 * not read so the form can point at it.
 */
export function parseRecipients(text: string): AlertRecipients & { invalid: string[] } {
  const phones: string[] = [];
  const emails: string[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/[\s,،؛;]+/)) {
    const token = raw.trim();
    if (!token) continue;
    const latin = token.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
    const mobile = latin.replace(/^(\+98|0098|98)(?=9\d{9}$)/, '0');
    if (/^09\d{9}$/.test(mobile)) {
      if (!phones.includes(mobile)) phones.push(mobile);
    } else if (z.string().email().safeParse(token).success) {
      if (!emails.includes(token.toLowerCase())) emails.push(token.toLowerCase());
    } else {
      invalid.push(token);
    }
  }
  return { phones, emails, invalid };
}

/** The home-page figures; empty (band hidden) when the database is unreachable. */
export async function getHomeStats(): Promise<HomeStat[]> {
  try {
    return await getSetting('home.stats');
  } catch (error) {
    console.error('getHomeStats: hiding the band', error);
    return [];
  }
}

/** Reads the four label/value pairs of the settings form; half-filled rows are errors. */
export function parseHomeStats(values: Record<string, string>) {
  const stats: HomeStat[] = [];
  const errors: Record<string, string> = {};
  for (let i = 0; i < 4; i += 1) {
    const label = (values[`label${i}`] ?? '').trim();
    const value = (values[`value${i}`] ?? '').trim();
    if (!label && !value) continue;
    if (!label) errors[`label${i}`] = 'عنوان این عدد را بنویسید.';
    else if (label.length > 60) errors[`label${i}`] = 'عنوان بیش از حد طولانی است.';
    if (!value) errors[`value${i}`] = 'عدد را بنویسید.';
    else if (value.length > 20) errors[`value${i}`] = 'عدد بیش از حد طولانی است.';
    stats.push({ label, value });
  }
  return { stats, errors };
}

/** The header menu; the built-in one when nothing is saved or the database is unreachable. */
export async function getSiteMenu(): Promise<SiteMenu> {
  try {
    return await getSetting('site.menu');
  } catch (error) {
    console.error('getSiteMenu: using the built-in menu', error);
    return defaultMenu;
  }
}

/** Internal paths (/…) or full http(s) addresses only. */
function validHref(href: string) {
  return /^\/(?!\/)[^\s]*$/.test(href) || /^https?:\/\/[^\s]+$/.test(href);
}

/**
 * Reads the menu form: `s<i>title` / `s<i>href` / `s<i>icon` rows for the
 * «خدمات» dropdown and `m<i>title` / `m<i>href` rows for the top links. Empty
 * rows are dropped; `reset` brings back the built-in menu.
 */
export function parseSiteMenu(values: Record<string, string>) {
  if (values.reset === '1') return { menu: defaultMenu, errors: {} };
  const errors: Record<string, string> = {};
  const read = (prefix: string, count: number) => {
    const rows: { title: string; href: string; icon: string }[] = [];
    for (let i = 0; i < count; i += 1) {
      const title = (values[`${prefix}${i}title`] ?? '').trim();
      const href = (values[`${prefix}${i}href`] ?? '').trim();
      const icon = values[`${prefix}${i}icon`] ?? 'link';
      if (!title && !href) continue;
      if (!title) errors[`${prefix}${i}title`] = 'عنوان را بنویسید.';
      else if (title.length > 40) errors[`${prefix}${i}title`] = 'عنوان بیش از حد طولانی است.';
      if (!validHref(href)) {
        errors[`${prefix}${i}href`] =
          'نشانی باید با / (صفحه‌ای از همین سایت) یا https:// شروع شود.';
      }
      rows.push({ title, href, icon: Object.hasOwn(menuIconLabel, icon) ? icon : 'link' });
    }
    return rows;
  };
  const services = read('s', MAX_SERVICE_ITEMS);
  const main = read('m', MAX_MAIN_ITEMS).map(({ title, href }) => ({ title, href }));
  return { menu: { services, main }, errors };
}

/** The site notice to show now, or null; nothing when the database is unreachable. */
export async function getActiveAnnouncement(now = new Date()): Promise<ActiveAnnouncement | null> {
  try {
    return activeAnnouncement(await getSetting('site.announcement'), now);
  } catch (error) {
    console.error('getActiveAnnouncement: showing no notice', error);
    return null;
  }
}
