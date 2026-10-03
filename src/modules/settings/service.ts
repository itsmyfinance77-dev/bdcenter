import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/modules/audit/service';

/**
 * Small switches an ADMIN can change from the panel, stored as one JSON value
 * per key in `site_settings`. Each setting has a typed default, so a missing
 * row simply means "not changed yet".
 */

const definitions = {
  /** Members must upload an image of their national card (owner's request: optional until an ADMIN decides). */
  'members.nationalCardRequired': { schema: z.boolean(), fallback: false },
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
