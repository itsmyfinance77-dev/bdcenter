/** Unicode letters/digits separated by single hyphens; Persian slugs are allowed. */
export const slugPattern = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

/** Persian half-space (نیم‌فاصله); becomes a hyphen in slugs. */
const ZERO_WIDTH_NON_JOINER = String.fromCharCode(0x200c);

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replaceAll(ZERO_WIDTH_NON_JOINER, '-')
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

export const SLUG_ERROR = 'نامک فقط می‌تواند حروف، عدد و خط تیره داشته باشد.';
export const SLUG_TAKEN = 'این نامک قبلاً استفاده شده است.';
