import { attachmentDisposition } from '@/lib/csv';
import { getCurrentAdmin } from '@/modules/auth/service';
import { exportConsultingCsv, requestStatusSchema } from '@/modules/consulting/service';

/** Consulting requests (optionally `?status=`) as a CSV file for Excel. */
export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response('Unauthorized', { status: 401 });
  const status = requestStatusSchema.safeParse(
    new URL(request.url).searchParams.get('status'),
  ).data;
  return new Response(await exportConsultingCsv(admin.id, status), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': attachmentDisposition(
        `consulting-requests${status ? `-${status.toLowerCase()}` : ''}.csv`,
      ),
      'Cache-Control': 'no-store',
    },
  });
}
