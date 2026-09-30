import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { requestStatusLabel } from '@/content/admin';
import { consultingCopy, memberCopy } from '@/content/members';
import { formatDate, formatDateTime, toPersianDigits } from '@/lib/format';
import { listMemberConsultingRequests } from '@/modules/consulting/service';
import { requireMember } from '@/modules/members/service';
import { listMemberEnrollments } from '@/modules/training/service';
import {
  cancelEnrollmentAction,
  memberLogoutAction,
  memberLogoutEverywhereAction,
} from './actions';
import { ProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: memberCopy.accountTitle,
  robots: { index: false, follow: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; next?: string }>;
}) {
  const member = await requireMember();
  const { welcome, next } = await searchParams;
  const [enrollments, consultingRequests] = await Promise.all([
    listMemberEnrollments(member.id),
    listMemberConsultingRequests(member.id),
  ]);

  const initial = {
    fullName: member.fullName ?? '',
    nationalId: member.nationalId ?? '',
    companyName: member.companyName ?? '',
    email: member.email ?? '',
  };

  return (
    <>
      <PageHeader title={memberCopy.accountTitle} crumbs={[{ title: memberCopy.accountTitle }]} />
      <div className="mx-auto grid max-w-(--container-page) gap-6 px-4 py-12 lg:grid-cols-2">
        <section
          aria-labelledby="profile-heading"
          className="rounded-panel border border-line bg-white p-6"
        >
          <h2 id="profile-heading" className="text-lg font-bold text-brand-900">
            اطلاعات من
          </h2>
          <p className="mt-1 mb-4 text-sm text-ink-2">
            شماره همراه: <span dir="ltr">{toPersianDigits(member.phone)}</span>
          </p>
          {welcome || !member.fullName ? (
            <p className="mb-4 rounded-control border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
              {welcome ? `${memberCopy.accountCreated} ` : null}
              {memberCopy.completeProfile}
            </p>
          ) : null}
          <p className="mb-4 text-xs text-ink-2">{memberCopy.profileLead}</p>
          <ProfileForm initial={initial} next={next} />
        </section>

        <section aria-labelledby="enrollments-heading" className="space-y-6">
          <div className="rounded-panel border border-line bg-white p-6">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 id="enrollments-heading" className="text-lg font-bold text-brand-900">
                دوره‌های من
              </h2>
              <Link href="/courses" className="text-sm text-primary hover:underline">
                همه دوره‌ها
              </Link>
            </div>
            {enrollments.length === 0 ? (
              <p className="text-sm text-ink-2">هنوز در دوره‌ای ثبت‌نام نکرده‌اید.</p>
            ) : (
              <ul className="divide-y divide-line">
                {enrollments.map((enrollment) => (
                  <li
                    key={enrollment.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      {enrollment.course.status === 'PUBLISHED' ? (
                        <Link
                          href={`/courses/${enrollment.course.slug}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {enrollment.course.title}
                        </Link>
                      ) : (
                        <span className="font-medium text-ink">{enrollment.course.title}</span>
                      )}
                      <p className="text-xs text-ink-2">
                        {enrollment.course.startsAt
                          ? `شروع: ${formatDateTime(enrollment.course.startsAt)} · `
                          : null}
                        ثبت‌نام: {formatDate(enrollment.createdAt)} · وضعیت:{' '}
                        {requestStatusLabel[enrollment.status]}
                      </p>
                    </div>
                    {enrollment.status === 'NEW' ? (
                      <form action={cancelEnrollmentAction.bind(null, enrollment.id)}>
                        <button type="submit" className="text-xs text-danger hover:underline">
                          انصراف
                        </button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-panel border border-line bg-white p-6">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 id="consulting-heading" className="text-lg font-bold text-brand-900">
                درخواست‌های مشاوره من
              </h2>
              <Link href="/services/consulting" className="text-sm text-primary hover:underline">
                درخواست جدید
              </Link>
            </div>
            {consultingRequests.length === 0 ? (
              <p className="text-sm text-ink-2">{consultingCopy.none}</p>
            ) : (
              <ul className="divide-y divide-line">
                {consultingRequests.map((request) => (
                  <li key={request.id} className="py-3">
                    <p className="font-medium text-ink">{request.topic}</p>
                    <p className="text-xs text-ink-2">
                      ثبت: {formatDate(request.createdAt)} · وضعیت:{' '}
                      {requestStatusLabel[request.status]}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <form action={memberLogoutAction}>
              <button type="submit" className="text-ink-2 hover:text-danger">
                خروج
              </button>
            </form>
            <form action={memberLogoutEverywhereAction}>
              <button type="submit" className="text-ink-2 hover:text-danger">
                خروج از همه دستگاه‌ها
              </button>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}
