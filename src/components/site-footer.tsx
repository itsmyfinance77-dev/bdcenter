import Link from 'next/link';
import { LinkAnchor } from '@/components/chamber-links';
import { ContactDetails } from '@/components/contact-details';
import { siteInfo } from '@/content/site';
import { formatYear } from '@/lib/format';
import { listLinksSafe } from '@/modules/links/service';
import { listPublishedSystemPages } from '@/modules/pages/service';

/** Published privacy/terms pages; the footer still renders if the database is down. */
async function publishedLegalPages() {
  try {
    return (await listPublishedSystemPages()).filter((page) => page.slug !== 'about');
  } catch (error) {
    console.error('Footer: could not load pages', error);
    return [];
  }
}

export async function SiteFooter() {
  const [usefulLinks, legalPages] = await Promise.all([
    listLinksSafe('useful-links'),
    publishedLegalPages(),
  ]);

  return (
    <footer className="border-t border-line bg-brand-900 text-on-dark">
      <div className="mx-auto max-w-(--container-page) px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-white">اطلاعات تماس مرکز</h2>
            <ContactDetails className="space-y-1 text-sm" />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold text-white">پیوندهای مفید</h2>
            {usefulLinks.length === 0 ? (
              <p className="text-sm">به‌زودی اضافه می‌شود.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {usefulLinks.map((link) => (
                  <li key={link.id}>
                    <LinkAnchor url={link.url} className="hover:text-white hover:underline">
                      {link.title}
                    </LinkAnchor>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-on-dark-2">
          <p>
            © {formatYear(new Date())} {siteInfo.name} · {siteInfo.parentOrg}
          </p>
          {legalPages.length > 0 ? (
            <ul className="flex gap-4">
              {legalPages.map((page) => (
                <li key={page.slug}>
                  <Link href={page.path} className="hover:text-white hover:underline">
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
