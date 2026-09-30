import Link from 'next/link';

type Crumb = { title: string; href?: string };

/** Title band shared by inner pages, with a breadcrumb trail back to home. */
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
    <section className="bg-brand-900 py-10 text-white">
      <div className="mx-auto max-w-(--container-page) px-4">
        <nav aria-label="مسیر صفحه" className="text-xs text-on-dark-2">
          <ol className="flex flex-wrap gap-1">
            <li>
              <Link href="/" className="hover:text-white">
                خانه
              </Link>
            </li>
            {crumbs.map((crumb) => (
              <li key={crumb.title} className="before:me-1 before:content-['/']">
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-white">
                    {crumb.title}
                  </Link>
                ) : (
                  crumb.title
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{title}</h1>
        {lead ? <p className="mt-3 max-w-2xl text-sm leading-7 text-on-dark">{lead}</p> : null}
      </div>
    </section>
  );
}
