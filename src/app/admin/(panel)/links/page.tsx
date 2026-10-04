import { ConfirmButton } from '@/components/admin/confirm-button';
import { AdminHeading } from '@/components/admin/ui';
import { linkSections } from '@/content/pages';
import { listAllLinksForAdmin } from '@/modules/links/service';
import { deleteLinkAction } from './actions';
import { LinkForm } from './link-form';
import { requireAdmin } from '@/modules/auth/service';

export const metadata = { title: 'پیوندها' };

export default async function LinksAdminPage() {
  await requireAdmin();
  const sections = await listAllLinksForAdmin();
  return (
    <>
      <AdminHeading title="پیوندها" />
      <p className="mb-6 text-sm text-ink-2">
        نشانی باید با https:// شروع شود، یا برای صفحه‌های همین سایت با / (مثلاً /privacy). عدد ترتیب
        کوچک‌تر بالاتر نمایش داده می‌شود.
      </p>
      <div className="space-y-8">
        {sections.map(({ section, links }) => (
          <section
            key={section}
            aria-labelledby={`links-${section}`}
            className="rounded-panel border border-line bg-white p-6"
          >
            <h2 id={`links-${section}`} className="mb-4 font-bold text-brand-900">
              {linkSections[section]}
            </h2>
            {links.length === 0 ? (
              <p className="mb-4 text-sm text-ink-2">
                پیوندی ثبت نشده است؛ این بخش در سایت «به‌زودی» نشان می‌دهد یا پنهان است.
              </p>
            ) : (
              <ul className="mb-6 space-y-3">
                {links.map((link) => (
                  <li key={link.id} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <LinkForm
                        id={link.id}
                        section={section}
                        initial={{
                          title: link.title,
                          url: link.url,
                          sortOrder: String(link.sortOrder),
                        }}
                      />
                    </div>
                    <ConfirmButton
                      action={deleteLinkAction.bind(null, link.id)}
                      message={`پیوند «${link.title}» حذف شود؟`}
                    >
                      حذف
                    </ConfirmButton>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="mb-2 text-sm font-semibold text-ink">افزودن پیوند</h3>
            {/* key: remounts (and empties) the form once the new link is listed. */}
            <LinkForm
              key={links.length}
              id={null}
              section={section}
              initial={{
                title: '',
                url: '',
                sortOrder: String((links.at(-1)?.sortOrder ?? 0) + 10),
              }}
            />
          </section>
        ))}
      </div>
    </>
  );
}
