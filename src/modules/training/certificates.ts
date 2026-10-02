import { randomBytes } from 'node:crypto';
import { certificateCopy } from '@/content/certificate';
import { formatDate } from '@/lib/format';
import { prisma, Prisma } from '@/lib/prisma';
import { toLatinDigits } from '@/lib/validation';
import { recordAudit } from '@/modules/audit/service';

/**
 * Course-completion certificates (training domain). A certificate exists for
 * an enrollment once it is DONE in a course with certificates turned on. It
 * copies the name, course and signatory at issue time and carries a public
 * code for verification. If the enrollment leaves DONE, the certificate is
 * revoked (and restored, same code, if it becomes DONE again).
 */

type Tx = Prisma.TransactionClient;

/** Crockford base32: no I, L, O or U, so codes survive being read aloud or retyped. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** "BDC-7K2M-9QX4": 40 random bits. */
export function generateCertificateCode(): string {
  const bytes = randomBytes(8);
  const chars = Array.from(bytes, (byte) => ALPHABET[byte % 32]).join('');
  return `BDC-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

/**
 * Canonical form of a code someone typed: case, Persian digits, spaces and
 * dashes do not matter, and the look-alikes O/I/L read as 0/1. Null when it
 * cannot be a certificate code.
 */
export function normalizeCertificateCode(input: string): string | null {
  const compact = toLatinDigits(input)
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  const body = compact.startsWith('BDC') ? compact.slice(3) : compact;
  if (!/^[0-9A-HJKMNP-TV-Z]{8}$/.test(body)) return null;
  return `BDC-${body.slice(0, 4)}-${body.slice(4)}`;
}

export type CertificateRecord = Prisma.CertificateGetPayload<object>;

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}

/** " از ۱۰ مهر ۱۴۰۵ تا ۸ آبان ۱۴۰۵", " در ۱۰ مهر ۱۴۰۵" or "" (with a leading space). */
export function certificateDates(
  certificate: Pick<CertificateRecord, 'courseStartsAt' | 'courseEndsAt'>,
): string {
  const { courseStartsAt: from, courseEndsAt: to } = certificate;
  if (from && to && formatDate(from) !== formatDate(to)) {
    return fillTemplate(certificateCopy.dates, { from: formatDate(from), to: formatDate(to) });
  }
  const single = from ?? to;
  return single ? fillTemplate(certificateCopy.singleDate, { from: formatDate(single) }) : '';
}

function snapshot(enrollment: {
  fullName: string;
  course: {
    title: string;
    startsAt: Date | null;
    endsAt: Date | null;
    certificateSignatory: string | null;
    certificateSignatoryTitle: string | null;
  };
}) {
  return {
    fullName: enrollment.fullName,
    courseTitle: enrollment.course.title,
    courseStartsAt: enrollment.course.startsAt,
    courseEndsAt: enrollment.course.endsAt,
    signatory: enrollment.course.certificateSignatory,
    signatoryTitle: enrollment.course.certificateSignatoryTitle,
  };
}

const courseFields = {
  title: true,
  startsAt: true,
  endsAt: true,
  certificateEnabled: true,
  certificateSignatory: true,
  certificateSignatoryTitle: true,
} as const;

async function createWithFreshCode(
  tx: Tx,
  data: Omit<Prisma.CertificateUncheckedCreateInput, 'code'>,
) {
  // A clash among 2^40 codes is very unlikely, but cheap to rule out. (Catching
  // a unique violation instead would abort the surrounding transaction.)
  let code = generateCertificateCode();
  while (await tx.certificate.findUnique({ where: { code }, select: { id: true } })) {
    code = generateCertificateCode();
  }
  return tx.certificate.create({ data: { ...data, code } });
}

/**
 * Brings an enrollment's certificate in line with its status. Runs inside the
 * status update's transaction. DONE + certificates on: issue, or restore a
 * revoked one. Anything else: revoke an existing certificate.
 */
export async function syncCertificate(tx: Tx, enrollmentId: string): Promise<void> {
  const enrollment = await tx.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    select: {
      status: true,
      fullName: true,
      course: { select: courseFields },
      certificate: { select: { id: true, revokedAt: true } },
    },
  });
  const { certificate } = enrollment;

  if (enrollment.status !== 'DONE') {
    if (certificate && !certificate.revokedAt) {
      await tx.certificate.update({
        where: { id: certificate.id },
        data: { revokedAt: new Date() },
      });
    }
    return;
  }
  if (certificate) {
    if (certificate.revokedAt) {
      await tx.certificate.update({ where: { id: certificate.id }, data: { revokedAt: null } });
    }
    return;
  }
  if (enrollment.course.certificateEnabled) {
    await createWithFreshCode(tx, { enrollmentId, ...snapshot(enrollment) });
  }
}

/**
 * The valid certificate of an enrollment, issuing it now if the enrollment is
 * DONE and its course gives certificates (e.g. certificates were turned on
 * after the enrollment was marked DONE). `scope` limits it to the owning
 * member or to one course; anything outside the scope is "not found".
 */
export async function getOrIssueCertificate(
  enrollmentId: string,
  scope: { memberId?: string; courseId?: string } = {},
): Promise<CertificateRecord | null> {
  return prisma.$transaction(async (tx) => {
    // Lock the enrollment so two simultaneous downloads cannot both issue.
    const locked = await tx.$queryRaw<{ id: string; memberId: string; courseId: string }[]>`
      SELECT id, "memberId", "courseId" FROM enrollments WHERE id = ${enrollmentId} FOR UPDATE`;
    const row = locked[0];
    if (!row) return null;
    if (scope.memberId !== undefined && row.memberId !== scope.memberId) return null;
    if (scope.courseId !== undefined && row.courseId !== scope.courseId) return null;
    await syncCertificate(tx, enrollmentId);
    const certificate = await tx.certificate.findUnique({ where: { enrollmentId } });
    return certificate && !certificate.revokedAt ? certificate : null;
  });
}

/** Whether a certificate can be downloaded for this enrollment (for list views). */
export function certificateAvailable(enrollment: {
  status: string;
  course: { certificateEnabled: boolean };
  certificate: { revokedAt: Date | null } | null;
}): boolean {
  if (enrollment.status !== 'DONE') return false;
  return enrollment.certificate
    ? !enrollment.certificate.revokedAt
    : enrollment.course.certificateEnabled;
}

/** Public verification. Null when the code is malformed or unknown. */
export async function verifyCertificate(input: string) {
  const code = normalizeCertificateCode(input);
  if (!code) return null;
  return prisma.certificate.findUnique({
    where: { code },
    select: {
      code: true,
      fullName: true,
      courseTitle: true,
      courseStartsAt: true,
      courseEndsAt: true,
      issuedAt: true,
      revokedAt: true,
    },
  });
}

/**
 * Copies the current course title, dates and signatory (and the enrollment
 * name) onto an issued certificate, e.g. after a typo in the course was
 * fixed. The code stays the same.
 */
export async function refreshCertificate(enrollmentId: string, actorId: string): Promise<boolean> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      fullName: true,
      course: { select: courseFields },
      certificate: { select: { id: true } },
    },
  });
  if (!enrollment?.certificate) return false;
  await prisma.certificate.update({
    where: { id: enrollment.certificate.id },
    data: snapshot(enrollment),
  });
  await recordAudit({
    actorId,
    action: 'certificate.refresh',
    entity: 'Certificate',
    entityId: enrollment.certificate.id,
  });
  return true;
}
