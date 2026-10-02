import Image from 'next/image';
import Link from 'next/link';
import { LinkAnchor } from '@/components/chamber-links';
import { Icon } from '@/components/site/icons';
import { homeCopy, siteInfo } from '@/content/site';
import { formatYear, toPersianDigits } from '@/lib/format';
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

const headingClass = 'mb-4 text-[15px] font-bold text-white';

/** Navy footer (BDC Yazd design). Unconfirmed contact items (OQ-BD-02/03) are left out. */
export async function SiteFooter() {
  const [usefulLinks, socialLinks, legalPages] = await Promise.all([
    listLinksSafe('useful-links'),
    listLinksSafe('social'),
    publishedLegalPages(),
  ]);
  const { address, postalCode, phone, phoneExtension, email } = siteInfo.contact;

  return (
    <footer className="bg-brand-950 text-on-dark">
      <div className="mx-auto max-w-(--container-page) px-[clamp(20px,4vw,32px)] pt-[clamp(56px,7vw,80px)]">
        <div className="flex flex-wrap gap-x-8 gap-y-10">
          <div className="flex min-w-0 flex-[1.6_1_300px] flex-col gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/bdc-logo-white.png"
                alt=""
                width={50}
                height={50}
                className="size-[50px] flex-none"
              />
              <span className="flex flex-col leading-normal">
                <span className="font-display text-lg font-extrabold text-white">
                  {siteInfo.name}
                </span>
                <span className="text-[clamp(12px,3.2vw,12.5px)] whitespace-nowrap text-on-dark-2">
                  {siteInfo.parentOrg}
                </span>
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-[1_1_200px]">
            <h2 className={headingClass}>اطلاعات تماس مرکز</h2>
            <ul className="flex flex-col gap-3 text-[14.5px] leading-[1.8]">
              <li className="flex gap-2.5">
                <span className="flex-none text-on-dark-2">آدرس:</span>
                <span>{address}</span>
              </li>
              {postalCode ? (
                <li className="flex gap-2.5">
                  <span className="text-on-dark-2">کدپستی:</span>
                  <span>{toPersianDigits(postalCode)}</span>
                </li>
              ) : null}
              <li className="flex items-center gap-2.5">
                <span className="text-on-dark-2">تلفن:</span>
                <a
                  href={`tel:${phone.replace(/\D/g, '')}`}
                  dir="ltr"
                  className="font-semibold text-white hover:text-accent-light"
                >
                  {toPersianDigits(phone)}
                </a>
                {phoneExtension ? <span>داخلی {toPersianDigits(phoneExtension)}</span> : null}
              </li>
              {email ? (
                <li className="flex gap-2.5">
                  <span className="text-on-dark-2">ایمیل:</span>
                  <a
                    href={`mailto:${email}`}
                    dir="ltr"
                    className="text-white hover:text-accent-light"
                  >
                    {email}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          <div className="min-w-0 flex-[1_1_200px]">
            <h2 className={headingClass}>پیوندهای مفید</h2>
            {usefulLinks.length === 0 ? (
              <p className="text-[14.5px]">به‌زودی اضافه می‌شود.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-[14.5px]">
                {usefulLinks.map((link) => (
                  <li key={link.id}>
                    <LinkAnchor url={link.url} className="text-on-dark hover:text-white">
                      {link.title}
                    </LinkAnchor>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {socialLinks.length > 0 ? (
            <div className="min-w-0 flex-[1_1_200px]">
              <h2 className={headingClass}>شبکه‌های اجتماعی</h2>
              <ul className="flex flex-wrap gap-2">
                {socialLinks.map((link) => (
                  <li key={link.id}>
                    <LinkAnchor
                      url={link.url}
                      className="inline-flex min-h-10 items-center rounded-[10px] border border-white/20 px-3.5 text-[13px] text-on-dark hover:border-white/35 hover:text-white"
                    >
                      {link.title}
                    </LinkAnchor>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-6 text-[13px] text-on-dark-2">
          <p>
            © {formatYear(new Date())} {siteInfo.name} · {siteInfo.parentOrg}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {legalPages.map((page) => (
              <Link key={page.slug} href={page.path} className="text-on-dark hover:text-white">
                {page.title}
              </Link>
            ))}
            <a
              href="#top"
              className="inline-flex min-h-10 items-center gap-1.5 text-on-dark hover:text-white"
            >
              {homeCopy.backToTop}
              <Icon name="arrowUp" size={16} strokeWidth={2} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
