import { AdminHeading } from '@/components/admin/ui';
import { formatDateTime, formatNumber, toPersianDigits } from '@/lib/format';
import { requireAdmin } from '@/modules/auth/service';
import { announcementFormValues } from '@/modules/settings/announcement';
import { getJobRun } from '@/modules/jobs/service';
import {
  ALERT_KINDS,
  getHomeTexts,
  getSetting,
  MAX_MAIN_ITEMS,
  MAX_SERVICE_ITEMS,
} from '@/modules/settings/service';
import {
  AlertSettingsForm,
  AnnouncementSettingsForm,
  ContactSettingsForm,
  HomeTextsForm,
  MenuSettingsForm,
  ReminderSettingsForm,
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

/** Whether the scheduler that sends reminders is running (it calls every 15 minutes). */
function ReminderRunNote({ run }: { run: Awaited<ReturnType<typeof getJobRun>> }) {
  const result = run?.result as { sent?: number; failed?: number } | undefined;
  const stale = !run || Date.now() - run.lastRunAt.getTime() > 60 * 60 * 1000;
  return (
    <p
      className={`mb-4 rounded-control border px-4 py-3 text-sm leading-7 ${stale ? 'border-warning/40 bg-warning/10 text-ink' : 'border-line bg-surface-2 text-ink-2'}`}
    >
      {run
        ? `آخرین اجرای زمان‌بند: ${formatDateTime(run.lastRunAt)} — ${formatNumber(result?.sent ?? 0)} یادآوری فرستاده شد${result?.failed ? `، ${formatNumber(result.failed)} ناموفق` : ''}.`
        : 'زمان‌بند هنوز اجرا نشده است.'}
      {stale
        ? ' تا وقتی زمان‌بند روی سرور (هر ۱۵ دقیقه) اجرا نشود، یادآوری فرستاده نمی‌شود؛ به پشتیبان فنی خبر دهید.'
        : null}
    </p>
  );
}

export default async function SettingsPage() {
  await requireAdmin('ADMIN');
  const [announcement, contact, alerts, stats, menu, reminders, reminderRun, homeTexts] =
    await Promise.all([
      getSetting('site.announcement'),
      getSetting('site.contact'),
      getSetting('alerts.recipients'),
      getSetting('home.stats'),
      getSetting('site.menu'),
      getSetting('reminders'),
      getJobRun('reminders'),
      getHomeTexts(),
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
          title="نوار اطلاعیه"
          lead="پیامی کوتاه در نواری رنگی بالای همهٔ صفحه‌های سایت، مثل «مرکز تا ۱۵ فروردین تعطیل است». می‌توانید زمان شروع و پایان نمایش را هم تعیین کنید. بازدیدکننده می‌تواند آن را ببندد؛ اگر متن را عوض کنید، دوباره برایش نمایش داده می‌شود."
        >
          <AnnouncementSettingsForm initial={announcementFormValues(announcement)} />
        </Section>
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
          title="متن‌های صفحهٔ اصلی"
          lead="عنوان و جمله‌های بالای صفحهٔ اصلی و بخش «درباره مرکز». کادر خالی یعنی متن پیش‌فرض طراحی (زیر هر کادر نوشته شده است)."
        >
          <HomeTextsForm initial={homeTexts} />
        </Section>
        <Section
          title="مرکز در یک نگاه"
          lead="تا چهار عدد واقعی از کارنامهٔ مرکز (مثلاً شرکت‌های آموزش‌دیده یا جلسات مشاوره) که در صفحهٔ اصلی نمایش داده می‌شود. تا وقتی همه خالی باشند، این بخش در سایت دیده نمی‌شود."
        >
          <StatsSettingsForm initial={statValues} />
        </Section>
        <Section
          title="یادآوری پیامکی"
          lead="پیش از هر نوبت رزروشده و پیش از هر جلسهٔ دوره، به عضو پیامک یادآوری فرستاده می‌شود (و اگر ایمیل داده باشد، ایمیل). در ساعت‌های سکوت پیامکی فرستاده نمی‌شود؛ یادآوری‌ای که موعدش در این ساعت‌ها باشد، صبح فرستاده می‌شود (یا اگر صبح دیر است، شب قبل)."
        >
          <ReminderRunNote run={reminderRun} />
          <ReminderSettingsForm
            initial={{
              bookingsEnabled: reminders.bookings.enabled ? 'on' : '',
              bookingsHours: toPersianDigits(String(reminders.bookings.hoursBefore)),
              coursesEnabled: reminders.courses.enabled ? 'on' : '',
              coursesHours: toPersianDigits(String(reminders.courses.hoursBefore)),
              quietFrom: String(reminders.quietFrom),
              quietUntil: String(reminders.quietUntil),
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
