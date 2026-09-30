import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Private upload storage on the local disk (`storage/`, git-ignored). Files are
 * never served from `public/`; a later admin download route streams them as
 * attachments, signed with FILE_URL_SECRET.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const allowedTypes: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};

export const ACCEPTED_UPLOAD_EXTENSIONS = [...new Set(Object.values(allowedTypes).flat())];

export type StoredFile = {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

function storageRoot(): string {
  return path.resolve(process.env.STORAGE_DIR ?? 'storage');
}

/** Returns a Persian error message, or null when the file is acceptable. */
export function checkUpload(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return 'حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.';
  const extension = path.extname(file.name).toLowerCase();
  if (!allowedTypes[file.type]?.includes(extension)) {
    return 'نوع فایل مجاز نیست (PDF، تصویر، Word یا Excel).';
  }
  return null;
}

/** Stores an already-checked upload under `<STORAGE_DIR>/<area>/`. */
export async function storeUpload(area: string, file: File): Promise<StoredFile> {
  const extension = path.extname(file.name).toLowerCase();
  const storageKey = `${area}/${randomUUID()}${extension}`;
  const target = path.join(storageRoot(), storageKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return {
    storageKey,
    originalName: path.basename(file.name).slice(0, 200),
    mimeType: file.type,
    sizeBytes: file.size,
  };
}
