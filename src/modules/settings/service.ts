import { z } from 'zod';
import { siteInfo } from '@/content/site';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/modules/audit/service';

/**
 * Small switches and texts an ADMIN can change from the panel, stored as one
 * JSON value per key in `site_settings`. Each setting has a typed default, so
 * a missing (or malformed) row simply means "not changed yet".
 */

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
