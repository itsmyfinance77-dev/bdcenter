import { getCurrentAdmin } from '@/modules/auth/service';
import { certificateResponse } from '@/modules/training/certificate-pdf';
import { getOrIssueCertificate } from '@/modules/training/certificates';

export const dynamic = 'force-dynamic';

/** A participant's certificate as a PDF, for staff (to print or send). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response('Unauthorized', { status: 401 });
  const { id, enrollmentId } = await params;
  const certificate = await getOrIssueCertificate(enrollmentId, { courseId: id });
  if (!certificate) return new Response('Not found', { status: 404 });
  return certificateResponse(certificate);
}
