import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createConsultingRequest,
  listMemberConsultingRequests,
} from '@/modules/consulting/service';

/** Consulting requests linked to member accounts; rows use the 0998 phone prefix. */

const PHONE_PREFIX = '0998';

async function cleanup() {
  await prisma.consultingRequest.deleteMany({ where: { phone: { startsWith: PHONE_PREFIX } } });
  await prisma.member.deleteMany({ where: { phone: { startsWith: PHONE_PREFIX } } });
}

beforeAll(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

const request = (topic: string) => ({
  fullName: 'تست',
  phone: '09980000001',
  topic,
  nationalId: undefined,
  email: undefined,
  companyName: undefined,
  description: undefined,
});

describe('consulting requests in the member area', () => {
  it("lists only the member's own requests, newest first", async () => {
    const member = await prisma.member.create({ data: { phone: '09980000001' } });
    const other = await prisma.member.create({ data: { phone: '09980000002' } });

    await createConsultingRequest(request('اول'), member.id);
    await createConsultingRequest(request('دوم'), member.id);
    await createConsultingRequest(request('دیگری'), other.id);
    await createConsultingRequest(request('بدون حساب'));

    const mine = await listMemberConsultingRequests(member.id);
    expect(mine.map((r) => r.topic)).toEqual(['دوم', 'اول']);
    expect(mine[0]).toMatchObject({ status: 'NEW' });

    const anonymous = await prisma.consultingRequest.findFirst({ where: { topic: 'بدون حساب' } });
    expect(anonymous?.memberId).toBeNull();
  });
});
