# ADR-0005: Rich (HTML) page bodies from a WYSIWYG editor

- Status: accepted
- Date: 2026-10-03

## Context

Page bodies (about, privacy, terms and custom `/pages/<slug>`) were Markdown,
rendered by react-markdown with raw HTML and images switched off. The owner
asked (2026-10-03) for a full editor in the admin panel: font, font size,
bullets, bold, images, tables, links and so on, without writing Markdown.

Fonts, sizes and colors cannot be expressed in Markdown, so the body has to
become HTML. HTML written by staff and shown to every visitor is the main
cross-site-scripting risk of the site.

## Decision

- The page form uses a TipTap (ProseMirror) editor in the browser
  (`src/components/admin/rich-editor.tsx`). Its toolbar only offers what the
  site supports: headings (h2–h4), the site's fonts (Vazirmatn, Anjoman) and
  Tahoma, eight font sizes, text and background color, bold/italic/underline/
  strike, alignment, bulleted/numbered lists, quotes, rules, links, images and
  tables.
- The body is stored as an `html` section in `Page.sections` together with its
  plain text (for search and excerpts). Pages saved earlier keep their
  `markdown` section and render as before until they are next saved; the
  editor opens them converted to HTML (marked → sanitized).
- Every body goes through one allow-list (`src/lib/rich-html.ts`,
  sanitize-html) **when it is saved and again when it is rendered**: only
  formatting tags; `style` limited to text-align, the offered fonts and sizes,
  and colors; links only http(s)/mailto/tel/relative (outside links get
  `target=_blank rel="noopener noreferrer nofollow"`); images only from
  `/page-images/<id>/<lg|sm>`. Scripts, event handlers, iframes, forms and
  outside images are dropped.
- Images are uploaded by staff through `POST /admin/pages/images` (signed-in
  admin, same origin), re-encoded to WebP like article covers (EXIF removed)
  and stored as `MediaAsset` rows with `purpose = "page"`. They are public as
  soon as they are uploaded, at a per-upload address that can be cached for a
  week.
- The CSP is unchanged: inline `style` attributes were already allowed
  (`style-src 'unsafe-inline'`); scripts cannot come back through the body.

## Consequences

- Staff format pages like in a word processor; the page looks the same in the
  editor and on the site (shared `.rich-content` styles in `globals.css`).
- An uploaded page image stays public even if the page is unpublished or the
  image removed from the body; unused images are not cleaned up yet.
- News and event bodies stay Markdown for now; the same editor can be used for
  them later with the same allow-list.
- Any new formatting option must be added both to the toolbar and to the
  allow-list (`src/lib/rich-format.ts` holds the shared font and size lists).
