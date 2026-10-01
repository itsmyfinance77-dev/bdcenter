import { Icon, type IconName } from '@/components/site/icons';
import { chamberLinkIcons, homeCopy } from '@/content/site';
import { listLinksSafe } from '@/modules/links/service';

/** Home-page section of outbound Chamber links (BDC Yazd design), edited in the admin panel. */
export async function ChamberLinks() {
  const links = await listLinksSafe('chamber-services');
  if (links.length === 0) return null;
  return (
    <section aria-labelledby="chamber-title" className="bg-surface-2 py-[clamp(64px,8vw,104px)]">
      <div className="mx-auto max-w-(--container-page) px-[clamp(20px,4vw,32px)]">
        <div data-reveal="" className="mb-7 flex flex-col gap-2.5">
          <h2
            id="chamber-title"
            className="text-[clamp(24px,2.8vw,32px)] leading-[1.4] font-extrabold text-brand-900"
          >
            {homeCopy.chamberTitle}
          </h2>
          <p className="text-[14.5px] text-ink-2">{homeCopy.chamberLead}</p>
        </div>
        <ul
          data-reveal=""
          data-reveal-delay="100"
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-3"
        >
          {links.map((link) => {
            const external = !link.url.startsWith('/');
            return (
              <li key={link.id}>
                <LinkAnchor
                  url={link.url}
                  className="flex min-h-16 items-center gap-3.5 rounded-[14px] border border-line bg-white px-4 py-3 text-ink transition-[transform,border-color,box-shadow] duration-250 ease-(--ease-out-soft) hover:-translate-y-0.5 hover:border-line-hover hover:text-brand-900 hover:shadow-[0_14px_30px_-20px_rgba(11,34,87,.45)]"
                >
                  <span className="grid size-10 flex-none place-items-center rounded-[11px] bg-primary-tint text-primary">
                    <Icon
                      name={(chamberLinkIcons[link.url] ?? 'link') as IconName}
                      size={20}
                      strokeWidth={1.7}
                    />
                  </span>
                  <span className="flex-1 text-[14.5px] leading-[1.7] font-semibold">
                    {link.title}
                  </span>
                  {external ? (
                    <>
                      <Icon name="external" size={16} strokeWidth={2} className="text-[#7d89a0]" />
                      <span className="sr-only">{homeCopy.newWindow}</span>
                    </>
                  ) : null}
                </LinkAnchor>
              </li>
            );
          })}
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
