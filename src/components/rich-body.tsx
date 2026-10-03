import { MarkdownBody } from '@/components/markdown';
import { RichHtml } from '@/components/rich-html';

/** A body from the rich editor, or (older records) Markdown. */
export function RichBody({ html, markdown }: { html: string | null; markdown: string | null }) {
  if (html) return <RichHtml html={html} />;
  return markdown ? <MarkdownBody source={markdown} /> : null;
}
