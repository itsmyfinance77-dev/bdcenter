import { attachmentDisposition } from '@/lib/csv';
import { getCurrentAdmin } from '@/modules/auth/service';
import { exportEnrollmentsCsv } from '@/modules/training/service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response('Unauthorized', { status: 401 });

  const csv = await exportEnrollmentsCsv((await params).id, admin.id);
  if (!csv) return new Response('Not found', { status: 404 });

  return new Response(csv.content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': attachmentDisposition(csv.filename),
      'Cache-Control': 'no-store',
    },
  });
}
