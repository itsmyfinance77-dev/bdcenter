import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tehranDayKey } from '@/lib/daily-counts';
import { prisma } from '@/lib/prisma';
import { getDashboardStats, recordPageView } from '@/modules/stats/service';

/** Page-view counting and dashboard figures; rows use the /test-stats path and 0995 phones. */

const PATH = '/test-stats-page';

async function cleanup() {
  await prisma.pageViewDaily.deleteMany({ where: { path: { startsWith: PATH } } });
  await prisma.member.deleteMany({ where: { phone: { startsWith: '0995' } } });
}

beforeAll(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('statistics', () => {
  it('counts concurrent page views exactly, per Tehran day', async () => {
    await Promise.all(Array.from({ length: 25 }, () => recordPageView(PATH)));
    const today = tehranDayKey(new Date());
    const row = await prisma.pageViewDaily.findUnique({
      where: { day_path: { day: new Date(`${today}T00:00:00Z`), path: PATH } },
    });
    expect(row?.count).toBe(25);

    // Yesterday's views land in their own row.
    await recordPageView(PATH, new Date(Date.now() - 24 * 60 * 60 * 1000));
    expect(await prisma.pageViewDaily.count({ where: { path: PATH } })).toBe(2);
  });

  it('reports views, top pages and new members over the range', async () => {
    const before = await getDashboardStats(7);
    await prisma.member.create({ data: { phone: '09950000001' } });
    await recordPageView(PATH);
    const after = await getDashboardStats(7);

    expect(after.days).toHaveLength(7);
    expect(after.views).toHaveLength(7);
    expect(after.totals.views).toBe(before.totals.views + 1);
    expect(after.totals.members).toBe(before.totals.members + 1);
    expect(after.activity.members.at(-1)!.value).toBe(before.activity.members.at(-1)!.value + 1);
    expect(after.topPages.find((page) => page.path === PATH)?.views).toBeGreaterThanOrEqual(27);
  });
});
