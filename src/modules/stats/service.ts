import { lastDays, tehranDayKey } from '@/lib/daily-counts';
import { prisma } from '@/lib/prisma';
import { countBookingsPerDay } from '@/modules/appointments/service';
import { countConsultingPerDay } from '@/modules/consulting/service';
import { countMessagesPerDay } from '@/modules/contact/service';
import { countSubmissionsPerDay } from '@/modules/forms/service';
import { countNewMembersPerDay } from '@/modules/members/stats';
import { countEnrollmentsPerDay } from '@/modules/training/service';

/**
 * Site statistics. Visits are counted as anonymous daily page views (no IP
 * address, cookie or visitor id is stored), sent by the browser after each
 * page load; activity figures come from each domain's own records.
 */

/** Paths that are never counted: private areas and machinery. */
const untracked = /^\/(admin|api|_next|account)(\/|$)/;

/**
 * The path to count for a page view, or null when it should not be counted.
 * Query strings and fragments are dropped; Persian slugs are decoded.
 */
export function normalizeTrackedPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.trim().split(/[?#]/)[0] ?? '';
  if (!text.startsWith('/') || text.startsWith('//') || text.length > 300) return null;
  let path: string;
  try {
    path = decodeURIComponent(text);
  } catch {
    return null;
  }
  path = path.length > 1 ? path.replace(/\/+$/, '') : path;
  if (untracked.test(path) || path.length > 200 || /[\u0000-\u001f]/.test(path)) return null;
  return path;
}

/** Counts one view of `path` for today (Tehran). One atomic upsert. */
export async function recordPageView(path: string, now = new Date()) {
  await prisma.$executeRaw`
    INSERT INTO page_views_daily (day, path, count)
    VALUES (${tehranDayKey(now)}::date, ${path}, 1)
    ON CONFLICT (day, path) DO UPDATE SET count = page_views_daily.count + 1`;
}

export const STAT_RANGES = [7, 30, 90] as const;
export type StatRange = (typeof STAT_RANGES)[number];

export type DayValue = { day: string; value: number };

function series(days: string[], counts: Map<string, number>): DayValue[] {
  return days.map((day) => ({ day, value: counts.get(day) ?? 0 }));
}

/** Everything the dashboard shows for the last `range` days. */
export async function getDashboardStats(range: StatRange, now = new Date()) {
  const days = lastDays(range, now);
  const from = new Date(`${days[0]}T00:00:00+03:30`);

  const [views, topPages, members, enrollments, consulting, bookings, submissions, messages] =
    await Promise.all([
      prisma.pageViewDaily.groupBy({
        by: ['day'],
        where: { day: { gte: new Date(`${days[0]}T00:00:00Z`) } },
        _sum: { count: true },
      }),
      prisma.pageViewDaily.groupBy({
        by: ['path'],
        where: { day: { gte: new Date(`${days[0]}T00:00:00Z`) } },
        _sum: { count: true },
        orderBy: { _sum: { count: 'desc' } },
        take: 10,
      }),
      countNewMembersPerDay(from),
      countEnrollmentsPerDay(from),
      countConsultingPerDay(from),
      countBookingsPerDay(from),
      countSubmissionsPerDay(from),
      countMessagesPerDay(from),
    ]);

  const viewCounts = new Map(
    views.map((row) => [row.day.toISOString().slice(0, 10), row._sum.count ?? 0]),
  );
  const activity = {
    members: series(days, members),
    enrollments: series(days, enrollments),
    consulting: series(days, consulting),
    bookings: series(days, bookings),
    submissions: series(days, submissions),
    messages: series(days, messages),
  };
  const total = (values: DayValue[]) => values.reduce((sum, point) => sum + point.value, 0);

  return {
    days,
    views: series(days, viewCounts),
    topPages: topPages.map((row) => ({ path: row.path, views: row._sum.count ?? 0 })),
    activity,
    totals: {
      views: total(series(days, viewCounts)),
      ...Object.fromEntries(Object.entries(activity).map(([key, values]) => [key, total(values)])),
    } as Record<'views' | keyof typeof activity, number>,
  };
}
