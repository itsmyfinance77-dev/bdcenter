/**
 * The formatting choices of the rich page editor (ADR-0005), shared by the
 * editor (browser) and the sanitizer (server, src/lib/rich-html.ts).
 */

/** Fonts the editor offers; values are the CSS variables set by src/app/fonts.ts. */
export const RICH_FONTS = {
  'var(--font-vazirmatn)': 'وزیرمتن',
  'var(--font-anjoman)': 'انجمن',
  Tahoma: 'تاهوما',
} as const;

/** Font sizes the editor offers. */
export const RICH_FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
