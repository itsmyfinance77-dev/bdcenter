import { getCurrentMember } from '@/modules/members/service';
import { certificateResponse } from '@/modules/training/certificate-pdf';
import { getOrIssueCertificate } from '@/modules/training/certificates';

export const dynamic = 'force-dynamic';

/** The signed-in member's own course certificate as a PDF (id = enrollment id). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member) return new Response('Unauthorized', { status: 401 });
  const certificate = await getOrIssueCertificate((await params).id, { memberId: member.id });
  if (!certificate) return new Response('Not found', { status: 404 });
  return certificateResponse(certificate, request.url);
}
