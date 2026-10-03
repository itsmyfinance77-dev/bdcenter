import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import { z } from 'zod';

/**
 * Private upload storage on the local disk (`storage/`, git-ignored). Files are
 * never served from `public/`; form attachments are only streamed, as
 * downloads, to a signed-in admin (see the submissions file route).
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

/**
 * The first bytes each accepted type must start with, so a renamed file (an
 * executable called `.pdf`) is refused even though the browser vouched for it.
 * docx/xlsx are ZIP containers; doc/xls are OLE2 compound files.
 */
const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE2 = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const signatures: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (WEBP at offset 8, checked below)
  'application/msword': [OLE2],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [ZIP],
  'application/vnd.ms-excel': [OLE2],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [ZIP],
};

/** Returns a Persian error message when the content does not match the declared type. */
export async function checkUploadContent(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const matches = (signatures[file.type] ?? []).some((sig) => sig.every((b, i) => head[i] === b));
  const webpOk = file.type !== 'image/webp' || String.fromCharCode(...head.slice(8, 12)) === 'WEBP';
  return matches && webpOk ? null : 'محتوای فایل با نوع آن مطابقت ندارد.';
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

/**
 * Absolute path of a stored upload. Keys come from the database, but the
 * check still refuses anything that would resolve outside the storage root.
 */
export function storedFilePath(storageKey: string): string | null {
  const root = storageRoot();
  const target = path.resolve(root, storageKey);
  return target.startsWith(root + path.sep) ? target : null;
}

/** Removes a stored upload. Missing files are ignored. */
export async function deleteStoredFile(storageKey: string) {
  const target = storedFilePath(storageKey);
  if (target) await rm(target, { force: true });
}

export const storedFileSchema = z.object({
  storageKey: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
});

// ---------------------------------------------------------------------------
// Public images (article covers). Unlike form attachments these are shown on
// the site, so every upload is re-encoded: EXIF (camera, GPS) is dropped, the
// orientation is baked in, and two WebP sizes are written. Re-encoding also
// means a crafted file is never served back byte-for-byte.
// ---------------------------------------------------------------------------

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];

export const ACCEPTED_IMAGE_EXTENSIONS = imageTypes.flatMap((type) => allowedTypes[type] ?? []);

export const IMAGE_VARIANTS = { lg: 1600, sm: 640 } as const;
export type ImageVariant = keyof typeof IMAGE_VARIANTS;

/** Returns a Persian error message, or null when the image is acceptable. */
export function checkImageUpload(file: File): string | null {
  if (!imageTypes.includes(file.type)) return 'فقط تصویر JPG، PNG یا WebP مجاز است.';
  return checkUpload(file);
}

/** Storage key of one size of a stored image; `storageKey` is the large size. */
export function imageVariantKey(storageKey: string, variant: ImageVariant): string {
  return variant === 'lg' ? storageKey : storageKey.replace(/\.webp$/, `-${variant}.webp`);
}

/**
 * Re-encodes an already-checked image upload under `<STORAGE_DIR>/<area>/`.
 * Returns null when the bytes are not a decodable image.
 */
export async function storeImage(area: string, file: File): Promise<StoredFile | null> {
  const input = Buffer.from(await file.arrayBuffer());
  const storageKey = `${area}/${randomUUID()}.webp`;
  try {
    // Trust the decoded bytes, not the browser's MIME type: sharp would also
    // read SVG, TIFF or GIF, which are not accepted here.
    const { format } = await sharp(input).metadata();
    if (!['jpeg', 'png', 'webp'].includes(format ?? '')) return null;
    const outputs = await Promise.all(
      (Object.entries(IMAGE_VARIANTS) as [ImageVariant, number][]).map(async ([variant, size]) => ({
        key: imageVariantKey(storageKey, variant),
        data: await sharp(input, { limitInputPixels: 50_000_000 })
          .rotate()
          .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
      })),
    );
    await mkdir(path.join(storageRoot(), area), { recursive: true });
    for (const output of outputs)
      await writeFile(path.join(storageRoot(), output.key), output.data);
    return {
      storageKey,
      originalName: path.basename(file.name).slice(0, 200),
      mimeType: 'image/webp',
      sizeBytes: outputs[0]?.data.length ?? 0,
    };
  } catch (error) {
    console.error('storeImage: could not process upload', error);
    return null;
  }
}

/** Removes a stored image and all of its sizes. Missing files are ignored. */
export async function deleteStoredImage(storageKey: string) {
  for (const variant of Object.keys(IMAGE_VARIANTS) as ImageVariant[]) {
    const target = storedFilePath(imageVariantKey(storageKey, variant));
    if (target) await rm(target, { force: true });
  }
}

export function isImageVariant(value: string): value is ImageVariant {
  return Object.hasOwn(IMAGE_VARIANTS, value);
}

/** Streams one size of a stored image, or a 404 when it is missing. */
export async function imageResponse(
  storageKey: string,
  variant: ImageVariant,
  cacheControl: string,
): Promise<Response> {
  const target = storedFilePath(imageVariantKey(storageKey, variant));
  if (!target) return new Response('Not found', { status: 404 });
  try {
    await stat(target);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  return new Response(Readable.toWeb(createReadStream(target)) as ReadableStream, {
    headers: {
      'Content-Type': 'image/webp',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': cacheControl,
    },
  });
}
