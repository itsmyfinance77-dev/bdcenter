/**
 * Neutralizes spreadsheet formulas (CSV injection) and quotes the cell. Some
 * spreadsheet programs skip leading spaces before a formula, so those count too.
 */
export function csvCell(text: string): string {
  const safe = /^ *[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** CSV text with a UTF-8 BOM, so Excel shows Persian correctly. */
export function toCsv(rows: string[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
}

/**
 * `Content-Disposition` for a download. Header values must be ASCII, so a
 * Persian name goes in the RFC 5987 `filename*` form with an ASCII fallback.
 */
export function attachmentDisposition(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7e]|["\\]/g, '_');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
