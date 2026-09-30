import { listLinksSafe } from '@/modules/links/service';

/** Home-page section of outbound Chamber links, edited in the admin panel. */
export async function ChamberLinks() {
  const links = await listLinksSafe('chamber-services');
  if (links.length === 0) return null;
  return (
    <section aria-labelledby="chamber-links-heading" className="bg-surface-2">
      <div className="mx-auto max-w-(--container-page) px-4 py-12">
        <h2 id="chamber-links-heading" className="mb-6 text-xl font-bold text-brand-900">
          دسترسی به خدمات اتاق بازرگانی یزد
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <li key={link.id}>
              <LinkAnchor
                url={link.url}
                className="block rounded-card border border-line bg-white px-4 py-3 text-sm text-ink hover:border-line-hover"
              >
                {link.title}
              </LinkAnchor>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Outbound links open in a new tab; links to this site's own pages do not. */
export function LinkAnchor({
  url,
  className,
  children,
}: {
  url: string;
  className?: string;
  children: React.ReactNode;
}) {
  const external = !url.startsWith('/');
  return (
    <a
      href={url}
      className={className}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      {children}
    </a>
  );
}
