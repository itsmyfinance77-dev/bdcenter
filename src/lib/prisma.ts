import { PrismaClient } from '../../prisma/generated/client';

/**
 * Single Prisma instance, reused across hot reloads in dev.
 * Every module accesses the database through a service function, not this
 * client directly, so cross-module boundaries stay enforced at review time.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
