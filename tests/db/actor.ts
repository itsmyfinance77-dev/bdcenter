import { prisma } from '@/lib/prisma';

/**
 * A throwaway ADMIN for tests whose service calls need an acting panel user
 * (audit entries). Tests must not borrow an existing account: CI starts from
 * an empty database, and the dev database's accounts belong to people.
 */
export async function createTestActor(email: string): Promise<{ id: string }> {
  await removeTestActor(email);
  return prisma.adminUser.create({
    data: { email, fullName: 'آزمون', passwordHash: 'x', role: 'ADMIN' },
    select: { id: true },
  });
}

/** Deletes the test actor and the audit entries it wrote. */
export async function removeTestActor(email: string) {
  const user = await prisma.adminUser.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;
  await prisma.auditLog.deleteMany({ where: { actorId: user.id } });
  await prisma.adminUser.delete({ where: { id: user.id } });
}
