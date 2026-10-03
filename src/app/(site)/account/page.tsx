import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { requestStatusLabel } from '@/content/admin';
import { appointmentsCopy, bookingStatusLabel, serviceLabel } from '@/content/appointments';
import { consultingCopy, memberCopy } from '@/content/members';
import { formatDate, formatDateTime, formatTime, toPersianDigits } from '@/lib/format';
import { listMemberBookings } from '@/modules/appointments/service';
import { listMemberConsultingRequests } from '@/modules/consulting/service';
import { requireMember } from '@/modules/members/service';
import { listMemberEnrollments } from '@/modules/training/service';
import {
  cancelBookingAction,
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
  searchParams: Promise<{ welcome?: string; next?: string; booked?: string }>;
}) {
  const member = await requireMember();
  const { welcome, next, booked } = await searchParams;
  const [enrollments, consultingRequests, bookings] = await Promise.all([
    listMemberEnrollments(member.id),
    listMemberConsultingRequests(member.id),
    listMemberBookings(member.id),
  ]);
  const now = new Date();

  const initial = {
    personType: member.personType ?? '',
    fullName: member.fullName ?? '',
    nationalId: member.nationalId ?? '',
    postalCode: member.postalCode ?? '',
    companyName: member.companyName ?? '',
    legalNationalId: member.legalNationalId ?? '',
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
          {welcome || member.access === 'incomplete' ? (
            <p className="mb-4 rounded-control border border-primary/30 bg-primary/10 px-4 py-3 text-sm leading-7 text-primary">
              {welcome ? `${memberCopy.accountCreated} ` : null}
              {memberCopy.completeProfile}
            </p>
          ) : member.access === 'pending' ? (
            <p
              role="status"
              className="mb-4 rounded-control border border-warning/40 bg-warning/10 px-4 py-3 text-sm leading-7 text-ink"
            >
              {memberCopy.pendingApproval}
            </p>
          ) : member.access === 'rejected' ? (
            <p
              role="alert"
              className="mb-4 rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-7 text-danger"
            >
              {memberCopy.rejected(member.approvalNote)}
            </p>
          ) : null}
          <p className="mb-4 text-xs text-ink-2">{memberCopy.profileLead}</p>
          <ProfileForm
            initial={initial}
            next={next}
            hasLetter={member.hasLetter}
            hasNationalCard={member.hasNationalCard}
            nationalCardRequired={member.nationalCardRequired}
          />
        </section>

        <section aria-labelledby="enrollments-heading" className="space-y-6">
          <div className="rounded-panel border border-line bg-white p-6">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 id="bookings-heading" className="text-lg font-bold text-brand-900">
                {appointmentsCopy.myBookings}
              </h2>
              <span className="flex gap-3 text-sm">
                <Link href="/appointments/consulting" className="text-primary hover:underline">
                  {serviceLabel.CONSULTING}
                </Link>
                <Link href="/appointments/service-desk" className="text-primary hover:underline">
                  {serviceLabel.SERVICE_DESK}
                </Link>
              </span>
            </div>
            {booked ? (
              <p
                role="status"
                className="mb-4 rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
              >
                {appointmentsCopy.booked}
              </p>
            ) : null}
            {bookings.length === 0 ? (
              <p className="text-sm text-ink-2">{appointmentsCopy.noBookings}</p>
            ) : (
              <ul className="divide-y divide-line">
                {bookings.map((booking) => {
                  const upcoming = booking.status === 'BOOKED' && booking.slot.startsAt > now;
                  return (
                    <li
                      key={booking.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="font-medium text-ink">
                          {booking.slot.staff.fullName} · {serviceLabel[booking.slot.staff.service]}
                        </p>
                        <p className="text-xs text-ink-2">
                          {formatDateTime(booking.slot.startsAt)} تا{' '}
                          {formatTime(booking.slot.endsAt)}
                          {booking.slot.location ? ` · ${booking.slot.location}` : null} · وضعیت:{' '}
                          {bookingStatusLabel[booking.status]}
                        </p>
                        <p className="text-xs text-ink-2">موضوع: {booking.topic}</p>
                      </div>
                      {upcoming ? (
                        <div className="flex items-center gap-3 text-xs">
                          <a
                            href={`/account/bookings/${booking.id}/ics`}
                            download
                            className="text-primary hover:underline"
                          >
                            {appointmentsCopy.addToCalendar}
                          </a>
                          <form action={cancelBookingAction.bind(null, booking.id)}>
                            <button type="submit" className="text-danger hover:underline">
                              {appointmentsCopy.cancel}
                            </button>
                          </form>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

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
                    {enrollment.hasCertificate ? (
                      <a
                        href={`/account/certificates/${enrollment.id}`}
                        className="rounded-control border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
                      >
                        دریافت گواهی پایان دوره (PDF)
                      </a>
                    ) : null}
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
