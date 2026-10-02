import { prisma } from '@/lib/prisma';

/**
 * Day keys and per-day row counts in Tehran time, for the statistics
 * dashboard. Each domain service exposes its own "created per day" count
 * through `countCreatedPerDay`, so the stats module never touches another
 * domain's tables directly.
 */

const tehranDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tehran',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "2026-10-02" for an instant, in Tehran. */
export function tehranDayKey(date: Date): string {
  return tehranDay.format(date);
}

/** The last `days` Tehran day keys, oldest first, ending today. */
export function lastDays(days: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    keys.push(tehranDayKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
  }
  return [...new Set(keys)];
}

/** Tables whose rows the dashboard counts by creation day. Fixed list: never user input. */
const countedTables = {
  members: 'members',
  enrollments: 'enrollments',
  consulting: 'consulting_requests',
  bookings: 'bookings',
  submissions: 'form_submissions',
  messages: 'contact_messages',
} as const;

export type CountedTable = keyof typeof countedTables;

/** Rows created per Tehran day since `from`, as day key -> count. */
export async function countCreatedPerDay(
  table: CountedTable,
  from: Date,
): Promise<Map<string, number>> {
  const rows = await prisma.$queryRawUnsafe<{ day: string; count: bigint }[]>(
    `SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tehran', 'YYYY-MM-DD') AS day,
            count(*) AS count
     FROM ${countedTables[table]}
     WHERE "createdAt" >= $1
     GROUP BY 1`,
    from,
  );
  return new Map(rows.map((row) => [row.day, Number(row.count)]));
}
