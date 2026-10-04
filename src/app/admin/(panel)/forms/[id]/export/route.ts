import { attachmentDisposition } from '@/lib/csv';
import { getCurrentAdmin } from '@/modules/auth/service';
import { exportSubmissionsCsv, parseSubmissionFilter } from '@/modules/forms/service';

/** The submissions matching the list's filters (same query string) as CSV. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response('Unauthorized', { status: 401 });

  const filter = parseSubmissionFilter(Object.fromEntries(new URL(request.url).searchParams));
  const csv = await exportSubmissionsCsv((await params).id, admin.id, filter);
  if (!csv) return new Response('Not found', { status: 404 });

  return new Response(csv.content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': attachmentDisposition(csv.filename),
      'Cache-Control': 'no-store',
    },
  });
}
