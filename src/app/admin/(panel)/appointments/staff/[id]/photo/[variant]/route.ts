import { getStaffForAdmin } from '@/modules/appointments/service';
import { getCurrentAdmin } from '@/modules/auth/service';
import { imageResponse, isImageVariant } from '@/modules/files/service';

/** Photo preview for the admin form, including inactive profiles. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; variant: string }> },
) {
  if (!(await getCurrentAdmin())) return new Response('Unauthorized', { status: 401 });
  const { id, variant } = await params;
  if (!isImageVariant(variant)) return new Response('Not found', { status: 404 });
  const staff = await getStaffForAdmin(id);
  if (!staff?.photoKey) return new Response('Not found', { status: 404 });
  return imageResponse(staff.photoKey, variant, 'private, no-store');
}
