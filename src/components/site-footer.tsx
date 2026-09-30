import { ContactDetails } from '@/components/contact-details';
import { siteInfo } from '@/content/site';
import { formatYear } from '@/lib/format';

export function SiteFooter() {
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
            <p className="text-sm">به‌زودی اضافه می‌شود.</p>
          </div>
        </div>
        <p className="mt-8 text-xs text-on-dark-2">
          © {formatYear(new Date())} {siteInfo.name} · {siteInfo.parentOrg}
        </p>
      </div>
    </footer>
  );
}
