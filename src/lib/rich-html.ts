import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { RICH_FONTS, RICH_FONT_SIZES } from './rich-format';

export { RICH_FONTS, RICH_FONT_SIZES };

/**
 * Rich page content from the admin editor (ADR-0005) is stored and shown as
 * HTML, so it goes through this allow-list both when it is saved and when it
 * is rendered: only formatting tags survive, styles are limited to the
 * editor's own choices (site fonts, a few sizes, colors, alignment), links
 * keep safe protocols and images may only come from the site's own page-image
 * store. Scripts, event handlers, iframes and outside images never pass.
 */

/** Where uploaded page images are served from (see src/app/page-images). */
export const PAGE_IMAGE_PATH = /^\/page-images\/[a-z0-9]{20,40}\/(lg|sm)$/;

const color = [
  /^#[0-9a-f]{3,8}$/i,
  /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+\s*)?\)$/i,
];
const fontFamily = new RegExp(
  `^(${Object.keys(RICH_FONTS)
    .map((font) => font.replace(/[()-]/g, (char) => `\\${char}`))
    .join('|')})$`,
);
const fontSize = new RegExp(`^(${RICH_FONT_SIZES.join('|')})$`);
const textAlign = [/^(right|left|center|justify)$/];

const options: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'h2',
    'h3',
    'h4',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'span',
    'mark',
    'ul',
    'ol',
    'li',
    'blockquote',
    'hr',
    'a',
    'img',
    'code',
    'pre',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'colgroup',
    'col',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt'],
    th: ['colspan', 'rowspan', 'style'],
    td: ['colspan', 'rowspan', 'style'],
    p: ['style'],
    h2: ['style'],
    h3: ['style'],
    h4: ['style'],
    li: ['style'],
    span: ['style'],
    mark: ['style'],
  },
  allowedStyles: {
    '*': { 'text-align': textAlign },
    span: {
      color,
      'background-color': color,
      'font-family': [fontFamily],
      'font-size': [fontSize],
    },
    mark: { 'background-color': color, color },
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: [] },
  allowProtocolRelative: false,
  transformTags: {
    h1: 'h2',
    a: (tagName, attribs) => {
      const external = /^https?:/i.test(attribs.href ?? '');
      return {
        tagName,
        attribs: {
          ...(attribs.href ? { href: attribs.href } : {}),
          ...(external ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {}),
        },
      };
    },
  },
  exclusiveFilter: (frame) => frame.tag === 'img' && !PAGE_IMAGE_PATH.test(frame.attribs.src ?? ''),
};

export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html, options);
}

/** The words of a rich body, for search, excerpts and "is it empty?" checks. */
export function richHtmlToText(html: string): string {
  return sanitizeHtml(html.replace(/<\/(p|h[1-6]|li|td|th|blockquote)>|<br\s*\/?>/gi, '$& '), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Markdown (older bodies, built-in drafts) as editor HTML. */
export function markdownToHtml(markdown: string): string {
  return sanitizeRichHtml(marked.parse(markdown, { async: false, gfm: true, breaks: true }));
}

/** What the rich editor starts from: the stored HTML, or older Markdown converted. */
export function editorHtml(html: string | null | undefined, markdown: string | null | undefined) {
  return html ? sanitizeRichHtml(html) : markdown ? markdownToHtml(markdown) : '';
}

/** Whether an editor body has any content (words or an image). */
export function hasRichContent(html: string): boolean {
  return richHtmlToText(html) !== '' || /<img\s/i.test(html);
}

/**
 * An editor body ready to store: sanitized HTML and its plain text (kept in
 * the older text column for search and excerpts), or nulls when empty.
 */
export function richInput(html: string | undefined): { html: string | null; text: string | null } {
  if (!html || !hasRichContent(html)) return { html: null, text: null };
  const clean = sanitizeRichHtml(html);
  return { html: clean, text: richHtmlToText(clean) };
}
