import { getPublicCoverKey } from '@/modules/content/service';
import { imageResponse, isImageVariant } from '@/modules/files/service';

/** Public cover images: only those used by a published article. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; variant: string }> },
) {
  const { id, variant } = await params;
  if (!isImageVariant(variant)) return new Response('Not found', { status: 404 });
  const storageKey = await getPublicCoverKey(id);
  if (!storageKey) return new Response('Not found', { status: 404 });
  // A replaced cover gets a new id, so a day of caching never shows a stale image.
  return imageResponse(storageKey, variant, 'public, max-age=86400');
}
