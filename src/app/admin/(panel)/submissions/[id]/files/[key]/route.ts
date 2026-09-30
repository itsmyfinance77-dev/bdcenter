import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { recordAudit } from '@/modules/audit/service';
import { getCurrentAdmin } from '@/modules/auth/service';
import { storedFilePath } from '@/modules/files/service';
import { getSubmissionFile } from '@/modules/forms/service';

/**
 * Streams a submission's uploaded file to a signed-in admin. Always served as
 * an attachment with `nosniff`, so an uploaded file is never rendered inline.
 */
export async function GET(
  _request: Request,
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

  await recordAudit({
    actorId: admin.id,
    action: 'form.submission.file',
    entity: 'FormSubmission',
    entityId: id,
    metadata: { field: key },
  });

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  });
}
