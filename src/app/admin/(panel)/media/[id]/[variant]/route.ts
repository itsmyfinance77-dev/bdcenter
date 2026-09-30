import { getCurrentAdmin } from '@/modules/auth/service';
import { getCoverKeyForAdmin } from '@/modules/content/service';
import { imageResponse, isImageVariant } from '@/modules/files/service';

/**
 * Cover preview for the admin form, including drafts' covers. Lives under
 * /admin because the session cookie is scoped to that path.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; variant: string }> },
) {
  if (!(await getCurrentAdmin())) return new Response('Unauthorized', { status: 401 });
  const { id, variant } = await params;
  if (!isImageVariant(variant)) return new Response('Not found', { status: 404 });
  const storageKey = await getCoverKeyForAdmin(id);
  if (!storageKey) return new Response('Not found', { status: 404 });
  return imageResponse(storageKey, variant, 'private, no-store');
}
