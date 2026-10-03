import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { attachmentDisposition } from '@/lib/csv';
import { recordAudit } from '@/modules/audit/service';
import { getCurrentAdmin } from '@/modules/auth/service';
import { storedFilePath } from '@/modules/files/service';
import { getMemberFile, type MemberFileKind } from '@/modules/members/service';

const kinds: MemberFileKind[] = ['letter', 'nationalCard'];

/**
 * A member's introduction letter or national card image, for an ADMIN.
 * JPEG/PNG (content-checked on upload) are shown inline for review; PDFs are
 * downloaded, never rendered in the panel's origin.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  const admin = await getCurrentAdmin();
  if (admin?.role !== 'ADMIN') return new Response('Unauthorized', { status: 401 });
  const { id, kind } = await params;
  if (!kinds.includes(kind as MemberFileKind)) return new Response('Not found', { status: 404 });

  const file = await getMemberFile(id, kind as MemberFileKind);
  const filePath = file ? storedFilePath(file.storageKey) : null;
  if (!file || !filePath) return new Response('Not found', { status: 404 });
  try {
    await stat(filePath);
  } catch {
    return new Response('File missing from storage', { status: 404 });
  }

  await recordAudit({
    actorId: admin.id,
    action: 'member.file',
    entity: 'Member',
    entityId: id,
    metadata: { kind },
  });

  const image = file.mimeType === 'image/jpeg' || file.mimeType === 'image/png';
  return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
    headers: {
      'Content-Type': image ? file.mimeType : 'application/octet-stream',
      'Content-Disposition': image ? 'inline' : attachmentDisposition(file.originalName),
      'Content-Security-Policy': "default-src 'none'; img-src 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
