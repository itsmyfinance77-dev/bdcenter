import { getPageImageKey } from '@/modules/content/service';
import { imageResponse, isImageVariant } from '@/modules/files/service';

/** Images placed in rich page bodies. Each upload has its own id, so they cache well. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; variant: string }> },
) {
  const { id, variant } = await params;
  if (!isImageVariant(variant)) return new Response('Not found', { status: 404 });
  const storageKey = await getPageImageKey(id);
  if (!storageKey) return new Response('Not found', { status: 404 });
  return imageResponse(storageKey, variant, 'public, max-age=604800, immutable');
}
