import { AdminHeading } from '@/components/admin/ui';
import { MarkdownBody } from '@/components/markdown';
import { adminGuide, adminGuideIntro } from '@/content/admin-guide';
import { formatNumber } from '@/lib/format';
import { requireAdmin } from '@/modules/auth/service';
import { smsSandboxEnabled } from '@/modules/messaging/sandbox';

export const metadata = { title: 'راهنمای پنل' };

/** The staff guide (src/content/admin-guide.ts); ADMIN-only sections only for ADMINs. */
export default async function HelpPage() {
  const admin = await requireAdmin();
  const sandbox = smsSandboxEnabled();
  const sections = adminGuide.filter(
    (section) =>
      (!section.adminOnly || admin.role === 'ADMIN') && (!section.sandboxOnly || sandbox),
  );

  return (
    <>
      <AdminHeading title="راهنمای پنل مدیریت" />
      <p className="mb-6 max-w-3xl text-sm leading-7 text-ink-2">{adminGuideIntro}</p>

      <nav
        aria-labelledby="guide-toc"
        className="mb-8 rounded-panel border border-line bg-white p-5 print:hidden"
      >
        <h2 id="guide-toc" className="mb-3 font-bold text-brand-900">
          فهرست
        </h2>
        <ol className="gap-x-8 space-y-1.5 text-sm sm:columns-2">
          {sections.map((section, index) => (
            <li key={section.id} className="break-inside-avoid">
              <a
                href={`#${section.id}`}
                className="inline-block py-0.5 text-primary hover:underline"
              >
                {formatNumber(index + 1)}. {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-6">
        {sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            className="scroll-mt-6 rounded-panel border border-line bg-white p-6 break-inside-avoid"
          >
            <h2 id={`${section.id}-title`} className="mb-3 text-lg font-bold text-brand-900">
              {formatNumber(index + 1)}. {section.title}
            </h2>
            <div className="max-w-3xl space-y-3 text-[15px] leading-8 text-ink">
              <MarkdownBody source={section.body.trim()} />
            </div>
            <a
              href="#guide-toc"
              className="mt-4 inline-block text-xs text-ink-2 hover:underline print:hidden"
            >
              بازگشت به فهرست
            </a>
          </section>
        ))}
      </div>
    </>
  );
}
