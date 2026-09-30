import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { appointmentsCopy, serviceLabel } from '@/content/appointments';
import { formatDateTime, formatTime } from '@/lib/format';
import { getSlotForBooking, slugByService } from '@/modules/appointments/service';
import { getCurrentMember } from '@/modules/members/service';
import { BookingForm } from './booking-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: appointmentsCopy.bookTitle,
  robots: { index: false, follow: false },
};

const primaryButton =
  'inline-block rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover';

export default async function BookSlotPage({ params }: { params: Promise<{ slotId: string }> }) {
  const { slotId } = await params;
  const slot = await getSlotForBooking(slotId);
  if (!slot) notFound();
  const member = await getCurrentMember();
  const service = serviceLabel[slot.staff.service];
  const listPath = `/appointments/${slugByService[slot.staff.service]}`;
  const path = `/appointments/book/${slot.id}`;

  return (
    <>
      <PageHeader
        title={appointmentsCopy.bookTitle}
        crumbs={[
          { title: appointmentsCopy.pageTitle(service), href: listPath },
          { title: appointmentsCopy.bookTitle },
        ]}
      />
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="space-y-6 rounded-panel border border-line bg-white p-6">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">بخش</dt>
              <dd className="text-ink">{service}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">با</dt>
              <dd className="text-end text-ink">
                {slot.staff.fullName}
                {slot.staff.title ? ` — ${slot.staff.title}` : null}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">زمان</dt>
              <dd className="text-ink">
                {formatDateTime(slot.startsAt)} تا {formatTime(slot.endsAt)}
              </dd>
            </div>
            {slot.location ? (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">مکان</dt>
                <dd className="text-ink">{slot.location}</dd>
              </div>
            ) : null}
          </dl>

          {slot.availability !== 'open' ? (
            <p className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {appointmentsCopy.unavailable[slot.availability]}{' '}
              <Link href={listPath} className="underline">
                زمان‌های دیگر
              </Link>
            </p>
          ) : !member ? (
            <Link
              href={`/account/login?next=${encodeURIComponent(path)}`}
              className={primaryButton}
            >
              {appointmentsCopy.loginToBook}
            </Link>
          ) : !member.fullName ? (
            <Link href={`/account?next=${encodeURIComponent(path)}`} className={primaryButton}>
              {appointmentsCopy.profileNeeded}
            </Link>
          ) : (
            <BookingForm slotId={slot.id} />
          )}
        </div>
      </div>
    </>
  );
}
