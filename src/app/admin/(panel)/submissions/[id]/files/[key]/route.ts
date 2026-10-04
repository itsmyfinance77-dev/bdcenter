import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { recordAudit } from '@/modules/audit/service';
import { getCurrentAdmin } from '@/modules/auth/service';
import { storedFilePath } from '@/modules/files/service';
import { getSubmissionFile } from '@/modules/forms/service';

/** Images whose first bytes were checked on upload; only these may be shown inline. */
const PREVIEW_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Streams a submission's uploaded file to a signed-in admin, as an attachment
 * with `nosniff`. With `?view=1` a JPEG/PNG/WebP image is shown inline for the
 * panel's preview, under a CSP that lets the response run nothing.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; key: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response('Unauthorized', { status: 401 });

  const { id, key } = await params;
  const file = await getSubmissionFile(id, key);
  const filePath = file ? storedFilePath(file.storageKey) : null;
  if (!file || !filePath) return new Response('Not found', { status: 404 });

  try {
    await stat(filePath);
  } catch {
    return new Response('File missing from storage', { status: 404 });
  }

  const inline =
    new URL(request.url).searchParams.get('view') === '1' && PREVIEW_TYPES.has(file.mimeType);
  await recordAudit({
    actorId: admin.id,
    action: 'form.submission.file',
    entity: 'FormSubmission',
    entityId: id,
    metadata: { field: key, ...(inline ? { preview: true } : {}) },
  });

  const name = encodeURIComponent(file.originalName);
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new Response(stream, {
    headers: {
      'Content-Type': inline ? file.mimeType : 'application/octet-stream',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${name}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'no-store',
    },
  });
}
