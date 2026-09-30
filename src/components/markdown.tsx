import Markdown, { defaultUrlTransform, type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders an article body written in Markdown. react-markdown builds React
 * elements from the syntax tree and never passes raw HTML through (`skipHtml`
 * drops it), so an editor cannot inject scripts or styles. Links keep only
 * http(s), mailto and tel targets; images are not rendered, so a body cannot
 * hotlink an outside server that would see every visitor's address.
 */

const allowedProtocols = /^(https?:|mailto:|tel:)/i;

function safeUrl(url: string): string {
  const transformed = defaultUrlTransform(url);
  if (transformed === '') return '';
  // Relative links (`/services/...`, `#section`) have no protocol and stay.
  return /^[a-z][a-z0-9+.-]*:/i.test(transformed) && !allowedProtocols.test(transformed)
    ? ''
    : transformed;
}

const components: Components = {
  // The page title is the only h1; body headings start one level down.
  h1: ({ children }) => <h2 className="mt-8 text-2xl font-bold text-brand-900">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-8 text-xl font-bold text-brand-900">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-6 text-lg font-semibold text-brand-900">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-6 font-semibold text-ink">{children}</h4>,
  h5: ({ children }) => <h5 className="mt-4 font-semibold text-ink">{children}</h5>,
  h6: ({ children }) => <h6 className="mt-4 font-semibold text-ink">{children}</h6>,
  p: ({ children }) => <p className="whitespace-pre-line">{children}</p>,
  ul: ({ children }) => <ul className="list-disc space-y-1 ps-6">{children}</ul>,
  ol: ({ children }) => <ol className="list-[persian] space-y-1 ps-6">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="border-s-4 border-line-hover ps-4 text-ink-2">{children}</blockquote>
  ),
  a: ({ href, children }) => {
    // A link whose target `safeUrl` refused shows as plain text.
    if (!href) return <>{children}</>;
    const external = href ? /^https?:/i.test(href) : false;
    return (
      <a
        href={href}
        className="text-primary underline underline-offset-4 hover:text-primary-hover"
        {...(external ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {})}
      >
        {children}
      </a>
    );
  },
  code: ({ children }) => (
    <code dir="ltr" className="rounded-chip bg-surface-2 px-1 py-0.5 text-sm">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre dir="ltr" className="overflow-x-auto rounded-card bg-surface-2 p-4 text-sm">
      {children}
    </pre>
  ),
  hr: () => <hr className="border-line" />,
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-line bg-surface-2 px-3 py-2 text-start font-medium">{children}</th>
  ),
  td: ({ children }) => <td className="border border-line px-3 py-2">{children}</td>,
};

export function MarkdownBody({ source }: { source: string }) {
  return (
    <div className="space-y-4 text-base leading-8 text-ink">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={components}
        skipHtml
        disallowedElements={['img']}
        unwrapDisallowed={false}
        urlTransform={safeUrl}
      >
        {source}
      </Markdown>
    </div>
  );
}
