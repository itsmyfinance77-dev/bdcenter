/** Plain-text helpers for Markdown bodies (meta descriptions, previews). */

/** A Markdown body as one line of plain text (formatting marks and link targets dropped). */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First ~160 characters of a Markdown body as plain text. */
export function plainExcerpt(markdown: string): string {
  return plainText(markdown).slice(0, 160);
}
