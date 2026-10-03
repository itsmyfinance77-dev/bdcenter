import { attachmentDisposition } from '@/lib/csv';
import { getCurrentAdmin } from '@/modules/auth/service';
import { exportMembersCsv } from '@/modules/members/service';

/** All members as a CSV file for Excel (ADMIN only). */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (admin?.role !== 'ADMIN') return new Response('Unauthorized', { status: 401 });
  return new Response(await exportMembersCsv(admin.id), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': attachmentDisposition('members.csv'),
      'Cache-Control': 'no-store',
    },
  });
}
