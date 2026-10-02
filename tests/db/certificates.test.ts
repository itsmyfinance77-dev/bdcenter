import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  getOrIssueCertificate,
  refreshCertificate,
  verifyCertificate,
} from '@/modules/training/certificates';
import { listMemberEnrollments, setEnrollmentStatus } from '@/modules/training/service';

/** Certificates against the dev DB; rows use the test-cert- prefix and 0994 phones. */

const PREFIX = 'test-cert-';
const ADMIN_EMAIL = 'test-cert-admin@bdcenter.test';
let adminId: string;

async function cleanup() {
  await prisma.course.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.member.deleteMany({ where: { phone: { startsWith: '0994' } } });
  await prisma.auditLog.deleteMany({ where: { actor: { email: ADMIN_EMAIL } } });
  await prisma.adminUser.deleteMany({ where: { email: ADMIN_EMAIL } });
}

async function setup(slug: string, certificateEnabled: boolean, phone: string) {
  const course = await prisma.course.create({
    data: {
      slug: `${PREFIX}${slug}`,
      title: `دوره ${slug}`,
      status: 'PUBLISHED',
      certificateEnabled,
      certificateSignatory: 'امضاکننده',
    },
  });
  const member = await prisma.member.create({ data: { phone, fullName: 'عضو آزمایشی' } });
  const enrollment = await prisma.enrollment.create({
    data: { courseId: course.id, memberId: member.id, fullName: 'عضو آزمایشی', phone },
  });
  return { course, member, enrollment };
}

beforeAll(async () => {
  await cleanup();
  adminId = (
    await prisma.adminUser.create({
      data: { email: ADMIN_EMAIL, fullName: 'آزمون گواهی', passwordHash: 'x', role: 'ADMIN' },
    })
  ).id;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('certificates', () => {
  it('follows the enrollment status: issued on DONE, revoked after, restored with the same code', async () => {
    const { course, member, enrollment } = await setup('status', true, '09940000001');

    await setEnrollmentStatus(enrollment.id, 'ACCEPTED', adminId);
    expect(await prisma.certificate.count({ where: { enrollmentId: enrollment.id } })).toBe(0);
    expect((await listMemberEnrollments(member.id))[0]?.hasCertificate).toBe(false);

    await setEnrollmentStatus(enrollment.id, 'DONE', adminId);
    const issued = await prisma.certificate.findUniqueOrThrow({
      where: { enrollmentId: enrollment.id },
    });
    expect(issued).toMatchObject({
      fullName: 'عضو آزمایشی',
      courseTitle: course.title,
      signatory: 'امضاکننده',
      revokedAt: null,
    });
    expect((await listMemberEnrollments(member.id))[0]?.hasCertificate).toBe(true);
    expect(await verifyCertificate(issued.code.toLowerCase())).toMatchObject({ revokedAt: null });

    await setEnrollmentStatus(enrollment.id, 'REJECTED', adminId);
    expect((await verifyCertificate(issued.code))?.revokedAt).not.toBeNull();
    expect(await getOrIssueCertificate(enrollment.id, { memberId: member.id })).toBeNull();

    await setEnrollmentStatus(enrollment.id, 'DONE', adminId);
    const restored = await getOrIssueCertificate(enrollment.id, { memberId: member.id });
    expect(restored).toMatchObject({ code: issued.code, revokedAt: null });
  });

  it('issues on first download when certificates were turned on later, exactly once', async () => {
    const { course, member, enrollment } = await setup('later', false, '09940000002');
    await setEnrollmentStatus(enrollment.id, 'DONE', adminId);
    expect(await getOrIssueCertificate(enrollment.id, { memberId: member.id })).toBeNull();

    await prisma.course.update({ where: { id: course.id }, data: { certificateEnabled: true } });
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        getOrIssueCertificate(enrollment.id, { memberId: member.id }),
      ),
    );
    expect(new Set(results.map((r) => r?.code)).size).toBe(1);
    expect(await prisma.certificate.count({ where: { enrollmentId: enrollment.id } })).toBe(1);
  });

  it('never hands a certificate to another member or through another course', async () => {
    const { enrollment } = await setup('scope', true, '09940000003');
    const other = await setup('scope-other', true, '09940000004');
    await setEnrollmentStatus(enrollment.id, 'DONE', adminId);

    expect(await getOrIssueCertificate(enrollment.id, { memberId: other.member.id })).toBeNull();
    expect(await getOrIssueCertificate(enrollment.id, { courseId: other.course.id })).toBeNull();
    expect(
      await getOrIssueCertificate(enrollment.id, { courseId: enrollment.courseId }),
    ).not.toBeNull();
    expect(await verifyCertificate('BDC-0000-0000')).toBeNull();
    expect(await verifyCertificate('not a code')).toBeNull();
  });

  it('keeps the issued snapshot until an admin refreshes it, code unchanged', async () => {
    const { course, enrollment } = await setup('refresh', true, '09940000005');
    await setEnrollmentStatus(enrollment.id, 'DONE', adminId);
    const before = await prisma.certificate.findUniqueOrThrow({
      where: { enrollmentId: enrollment.id },
    });

    await prisma.course.update({
      where: { id: course.id },
      data: { title: 'عنوان اصلاح‌شده', certificateSignatoryTitle: 'مدیر مرکز' },
    });
    expect((await verifyCertificate(before.code))?.courseTitle).toBe(course.title);

    expect(await refreshCertificate(enrollment.id, adminId)).toBe(true);
    const after = await prisma.certificate.findUniqueOrThrow({
      where: { enrollmentId: enrollment.id },
    });
    expect(after).toMatchObject({
      code: before.code,
      courseTitle: 'عنوان اصلاح‌شده',
      signatoryTitle: 'مدیر مرکز',
    });
    expect(
      await prisma.auditLog.count({ where: { actorId: adminId, action: 'certificate.refresh' } }),
    ).toBe(1);
  });
});
