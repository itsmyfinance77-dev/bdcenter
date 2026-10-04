import Link from 'next/link';
import { AdminHeading } from '@/components/admin/ui';
import { formatNumber } from '@/lib/format';
import { countUpcomingBookings } from '@/modules/appointments/service';
import { countNewConsultingRequests } from '@/modules/consulting/service';
import { countRecentContactMessages } from '@/modules/contact/service';
import { countArticlesByStatus } from '@/modules/content/service';
import { countNewSubmissions } from '@/modules/forms/service';
import { requireAdmin } from '@/modules/auth/service';
import { countMembers, countPendingMembers } from '@/modules/members/service';
import { countNewEnrollments } from '@/modules/training/service';

// A layout's title template applies to child segments only, not to its own page.
export const metadata = { title: { absolute: 'داشبورد | پنل مدیریت' } };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  await requireAdmin();
  const { denied } = await searchParams;
  const [consulting, messages, submissions, articles, enrollments, members, bookings, pending] =
    await Promise.all([
      countNewConsultingRequests(),
      countRecentContactMessages(),
      countNewSubmissions(),
      countArticlesByStatus(),
      countNewEnrollments(),
      countMembers(),
      countUpcomingBookings(),
      countPendingMembers(),
    ]);

  const tiles = [
    { title: 'درخواست‌های مشاوره جدید', value: consulting, href: '/admin/consulting?status=NEW' },
    { title: 'ثبت‌نام‌های دوره جدید', value: enrollments, href: '/admin/courses' },
    { title: 'نوبت‌های رزروشدهٔ پیش رو', value: bookings, href: '/admin/appointments' },
    { title: 'درخواست‌های فرم جدید', value: submissions, href: '/admin/forms' },
    { title: 'پیام‌های ۷ روز اخیر', value: messages, href: '/admin/messages' },
    { title: 'مطالب منتشر شده', value: articles.PUBLISHED ?? 0, href: '/admin/articles' },
    { title: 'پیش‌نویس‌ها', value: articles.DRAFT ?? 0, href: '/admin/articles' },
    { title: 'اعضای سایت', value: members, href: '/admin/members' },
    {
      title: 'اعضای در انتظار تأیید (شخص حقوقی)',
      value: pending,
      href: '/admin/members?filter=pending',
    },
  ];

  return (
    <>
      <AdminHeading title="داشبورد" />
      {denied ? (
        <p
          role="status"
          className="mb-4 rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          دسترسی به آن بخش فقط برای مدیر کل مجاز است.
        </p>
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.title}>
            <Link
              href={tile.href}
              className="block rounded-panel border border-line bg-white p-5 hover:border-line-hover"
            >
              <p className="text-sm text-ink-2">{tile.title}</p>
              <p className="mt-2 text-3xl font-bold text-brand-900">{formatNumber(tile.value)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
