import Link from 'next/link';
import { Icon } from '@/components/site/icons';

type Crumb = { title: string; href?: string };

/** Title band shared by inner pages (BDC Yazd design), with a breadcrumb trail back home. */
export function PageHeader({
  title,
  lead,
  crumbs = [],
}: {
  title: string;
  lead?: string;
  crumbs?: Crumb[];
}) {
  return (
    <section
      aria-labelledby="page-title"
      className="relative overflow-hidden bg-brand-900 bg-[radial-gradient(60%_140%_at_100%_0%,rgba(42,108,240,.45),transparent_60%),radial-gradient(40%_120%_at_0%_100%,rgba(20,163,168,.28),transparent_60%)] text-white"
    >
      <div
        aria-hidden="true"
        className="bg-dots absolute inset-0 [mask-image:linear-gradient(to_left,#000,transparent_70%)]"
      />
      <div className="relative mx-auto flex max-w-(--container-page) flex-col gap-4 px-[clamp(20px,4vw,32px)] pt-[clamp(40px,5vw,64px)] pb-[clamp(44px,5.5vw,72px)]">
        <nav aria-label="مسیر صفحه">
          <ol className="flex flex-wrap items-center gap-1.5 text-[13.5px] text-on-dark-2">
            <li>
              <Link href="/" className="text-on-dark hover:text-white">
                خانه
              </Link>
            </li>
            {crumbs.map((crumb, index) => (
              <li key={`${crumb.title}-${index}`} className="flex items-center gap-1.5">
                <Icon name="chevronCrumb" size={14} strokeWidth={2} />
                {crumb.href ? (
                  <Link href={crumb.href} className="text-on-dark hover:text-white">
                    {crumb.title}
                  </Link>
                ) : (
                  <span aria-current="page" className="font-semibold text-white">
                    {crumb.title}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1
          id="page-title"
          className="text-[clamp(30px,4.2vw,48px)] leading-[1.35] font-extrabold text-balance"
        >
          {title}
        </h1>
        {lead ? (
          <p className="max-w-[680px] text-[clamp(15px,1.5vw,17px)] leading-loose text-pretty text-on-dark">
            {lead}
          </p>
        ) : null}
      </div>
    </section>
  );
}
