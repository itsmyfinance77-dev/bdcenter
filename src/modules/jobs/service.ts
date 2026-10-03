import { prisma, Prisma } from '@/lib/prisma';

/**
 * Bookkeeping for scheduled jobs (the scheduler calls /api/cron/*): the time
 * and result of each job's last run, so the panel can show whether the
 * scheduler is actually running.
 */

export type JobName = 'reminders';

export async function recordJobRun(name: JobName, result: Prisma.InputJsonObject, at = new Date()) {
  await prisma.jobRun.upsert({
    where: { name },
    create: { name, lastRunAt: at, result },
    update: { lastRunAt: at, result },
  });
}

export async function getJobRun(name: JobName) {
  return prisma.jobRun.findUnique({ where: { name } });
}
