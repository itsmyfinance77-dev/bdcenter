import { AdminHeading } from '@/components/admin/ui';
import { requireAdmin } from '@/modules/auth/service';
import {
  ALERT_KINDS,
  getSetting,
  MAX_MAIN_ITEMS,
  MAX_SERVICE_ITEMS,
} from '@/modules/settings/service';
import {
  AlertSettingsForm,
  ContactSettingsForm,
  MenuSettingsForm,
  StatsSettingsForm,
} from './settings-forms';

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
  const [contact, alerts, stats, menu] = await Promise.all([
    getSetting('site.contact'),
    getSetting('alerts.recipients'),
    getSetting('home.stats'),
    getSetting('site.menu'),
  ]);
  const menuValues: Record<string, string> = {};
  menu.services.forEach((item, i) => {
    menuValues[`s${i}title`] = item.title;
    menuValues[`s${i}href`] = item.href;
    menuValues[`s${i}icon`] = item.icon;
  });
  menu.main.forEach((item, i) => {
    menuValues[`m${i}title`] = item.title;
    menuValues[`m${i}href`] = item.href;
  });
  const statValues = Object.fromEntries(
    stats.flatMap((stat, i) => [
      [`label${i}`, stat.label],
      [`value${i}`, stat.value],
    ]),
  );
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
          title="منوی سایت"
          lead="منوی بالای همهٔ صفحه‌ها: زیرمنوی «خدمات» و پیوندهای کنار آن. ردیف خالی نمایش داده نمی‌شود؛ ترتیب ردیف‌ها همان ترتیب منو است. «حساب کاربری» و جستجو همیشه در منو هستند."
        >
          <MenuSettingsForm
            initial={menuValues}
            serviceRows={MAX_SERVICE_ITEMS}
            mainRows={MAX_MAIN_ITEMS}
          />
        </Section>
        <Section
          title="مرکز در یک نگاه"
          lead="تا چهار عدد واقعی از کارنامهٔ مرکز (مثلاً شرکت‌های آموزش‌دیده یا جلسات مشاوره) که در صفحهٔ اصلی نمایش داده می‌شود. تا وقتی همه خالی باشند، این بخش در سایت دیده نمی‌شود."
        >
          <StatsSettingsForm initial={statValues} />
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
