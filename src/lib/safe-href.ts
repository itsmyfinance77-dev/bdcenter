/**
 * Links staff type into the panel (menu items, the site notice): a path on
 * this site (`/news`) or a full http(s) address. Browsers read a backslash
 * like a slash, so `/\evil.example` would be a protocol-relative link to
 * another site; backslashes and whitespace are refused everywhere.
 */
export function isSafeHref(href: string): boolean {
  if (/[\s\\]/.test(href)) return false;
  if (href.startsWith('/')) return !href.startsWith('//');
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    return new URL(href).hostname !== '';
  } catch {
    return false;
  }
}
