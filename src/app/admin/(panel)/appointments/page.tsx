import Link from 'next/link';
import { AdminHeading, ButtonLink, EmptyState, Table, Td } from '@/components/admin/ui';
import { serviceLabel } from '@/content/appointments';
import { formatDateTime, formatNumber, formatTime, toPersianDigits } from '@/lib/format';
import { listStaffForAdmin, listUpcomingBookings } from '@/modules/appointments/service';
import { setBookingStatusAction } from './actions';
import { BookingStatusForm } from './booking-status-form';
import { requireAdmin } from '@/modules/auth/service';

export const metadata = { title: 'نوبت‌دهی' };

export default async function AppointmentsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ taken?: string }>;
}) {
  await requireAdmin();
  const [{ taken }, staff, bookings] = await Promise.all([
    searchParams,
    listStaffForAdmin(),
    listUpcomingBookings(),
  ]);

  return (
    <>
      <AdminHeading title="نوبت‌دهی مشاوره و میز خدمت">
        <ButtonLink href="/admin/appointments/staff/new">پروفایل جدید</ButtonLink>
      </AdminHeading>
      {taken ? (
        <p
          role="status"
          className="mb-4 rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          این نوبت را شخص دیگری رزرو کرده است؛ رزرو لغوشده دوباره فعال نشد.
        </p>
      ) : null}

      <section aria-labelledby="staff-heading" className="mb-8">
        <h2 id="staff-heading" className="mb-3 text-lg font-bold text-brand-900">
          مشاوران و کارشناسان
        </h2>
        {staff.length === 0 ? (
          <EmptyState>هنوز پروفایلی تعریف نشده است.</EmptyState>
        ) : (
          <Table head={['نام', 'بخش', 'وضعیت', 'نوبت‌های آینده']}>
            {staff.map((person) => (
              <tr key={person.id}>
                <Td>
                  <Link
                    href={`/admin/appointments/staff/${person.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {person.fullName}
                  </Link>
                  {person.title ? <p className="text-xs text-ink-2">{person.title}</p> : null}
                </Td>
                <Td>{serviceLabel[person.service]}</Td>
                <Td>{person.isActive ? 'فعال' : 'غیرفعال'}</Td>
                <Td>{formatNumber(person.upcomingSlots)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section aria-labelledby="bookings-heading">
        <h2 id="bookings-heading" className="mb-3 text-lg font-bold text-brand-900">
          رزروهای پیش رو ({formatNumber(bookings.length)})
        </h2>
        {bookings.length === 0 ? (
          <EmptyState>رزرو فعالی وجود ندارد.</EmptyState>
        ) : (
          <Table head={['زمان', 'با', 'متقاضی', 'موضوع', 'وضعیت']}>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <Td>
                  {formatDateTime(booking.slot.startsAt)} تا {formatTime(booking.slot.endsAt)}
                  {booking.slot.location ? (
                    <p className="text-xs text-ink-2">{booking.slot.location}</p>
                  ) : null}
                </Td>
                <Td>
                  {booking.slot.staff.fullName}
                  <p className="text-xs text-ink-2">{serviceLabel[booking.slot.staff.service]}</p>
                </Td>
                <Td>
                  <span className="font-medium">{booking.fullName}</span>
                  <p className="text-xs text-ink-2" dir="ltr">
                    {toPersianDigits(booking.phone)}
                  </p>
                  {booking.companyName ? (
                    <p className="text-xs text-ink-2">{booking.companyName}</p>
                  ) : null}
                </Td>
                <Td>
                  {booking.topic}
                  {booking.description ? (
                    <p className="whitespace-pre-line text-xs text-ink-2">{booking.description}</p>
                  ) : null}
                </Td>
                <Td>
                  <BookingStatusForm
                    action={setBookingStatusAction.bind(null, booking.id)}
                    current={booking.status}
                  />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </>
  );
}
