import { sanitizeRichHtml } from '@/lib/rich-html';

/**
 * Renders a rich page body from the admin editor. The HTML was sanitized when
 * it was saved; it is sanitized again here so a row edited by any other route
 * still cannot inject markup (ADR-0005).
 */
export function RichHtml({ html }: { html: string }) {
  return (
    <div className="rich-content" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }} />
  );
}
