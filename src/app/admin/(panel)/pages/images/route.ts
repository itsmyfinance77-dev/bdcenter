import { getCurrentAdmin } from '@/modules/auth/service';
import { storePageImage } from '@/modules/content/service';

/**
 * Upload endpoint for the rich page editor: one image per request, answered
 * with its public address. Only signed-in staff, only from this site's pages.
 */
export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return Response.json({ error: 'دوباره وارد پنل شوید.' }, { status: 401 });
  const origin = request.headers.get('origin');
  if (
    origin &&
    origin !== new URL(request.url).origin &&
    origin !== process.env.NEXT_PUBLIC_SITE_URL
  ) {
    return Response.json({ error: 'درخواست نامعتبر است.' }, { status: 403 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get('image');
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: 'تصویری انتخاب نشده است.' }, { status: 400 });
  }
  const result = await storePageImage(file, admin.id);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ url: result.url });
}
