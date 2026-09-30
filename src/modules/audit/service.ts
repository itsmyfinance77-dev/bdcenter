import { prisma, type Prisma } from '@/lib/prisma';

/** Records an admin action. Every admin mutation calls this once. */
export async function recordAudit(entry: {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Prisma.InputJsonObject;
}) {
  await prisma.auditLog.create({ data: entry });
}

export async function listRecentAudit(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { actor: { select: { fullName: true } } },
  });
}
