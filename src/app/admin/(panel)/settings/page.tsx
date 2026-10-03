import { AdminHeading } from '@/components/admin/ui';
import { requireAdmin } from '@/modules/auth/service';
import { ALERT_KINDS, getSetting } from '@/modules/settings/service';
import { AlertSettingsForm, ContactSettingsForm } from './settings-forms';

export const metadata = { title: 'تنظیمات سایت' };

function Section({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-panel border border-line bg-white p-6">
      <h2 className="font-bold text-brand-900">{title}</h2>
      <p className="mt-1 mb-4 text-sm leading-7 text-ink-2">{lead}</p>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  await requireAdmin('ADMIN');
  const [contact, alerts] = await Promise.all([
    getSetting('site.contact'),
    getSetting('alerts.recipients'),
  ]);
  const alertValues = Object.fromEntries(
    ALERT_KINDS.map((kind) => [
      kind,
      [...(alerts[kind]?.phones ?? []), ...(alerts[kind]?.emails ?? [])].join('\n'),
    ]),
  );

  return (
    <>
      <AdminHeading title="تنظیمات سایت" />
      <div className="space-y-6">
        <Section
          title="اطلاعات تماس مرکز"
          lead="در پاورقی همهٔ صفحه‌ها، صفحهٔ «تماس با ما»، صفحهٔ «درباره مرکز» و اطلاعات موتورهای جستجو نمایش داده می‌شود."
        >
          <ContactSettingsForm
            initial={{
              address: contact.address,
              phone: contact.phone,
              phoneExtension: contact.phoneExtension ?? '',
              email: contact.email ?? '',
              postalCode: contact.postalCode ?? '',
            }}
          />
        </Section>
        <Section
          title="خبر دادن به کارمندان دربارهٔ درخواست‌های تازه"
          lead="وقتی درخواست تازه‌ای می‌رسد، به این شماره‌ها پیامک و به این ایمیل‌ها نامه فرستاده می‌شود، همراه با پیوند همان بخش پنل. پیامک‌ها از همان سامانهٔ پیامک سایت فرستاده می‌شوند."
        >
          <AlertSettingsForm initial={alertValues} />
        </Section>
      </div>
    </>
  );
}
