import { notFound } from 'next/navigation';
import { ConfirmButton } from '@/components/admin/confirm-button';
import { AdminHeading, dangerButtonClass, EmptyState, Table, Td } from '@/components/admin/ui';
import { bookingStatusLabel, serviceLabel } from '@/content/appointments';
import { formatNumber, formatTime, formatWeekdayDate, toPersianDigits } from '@/lib/format';
import { getStaffForAdmin, listSlotsForAdmin, staffPhotoUrl } from '@/modules/appointments/service';
import {
  cancelSlotAction,
  deleteSlotAction,
  deleteStaffAction,
  setBookingStatusAction,
} from '../../actions';
import { BookingStatusForm } from '../../booking-status-form';
import { SingleSlotForm, SlotSeriesForm } from '../../slot-forms';
import { StaffForm } from '../../staff-form';

export const metadata = { title: 'پروفایل و نوبت‌ها' };

export default async function StaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; inUse?: string }>;
}) {
  const [{ id }, { saved, inUse }] = await Promise.all([params, searchParams]);
  const staff = await getStaffForAdmin(id);
  if (!staff) notFound();
  const slots = await listSlotsForAdmin(staff.id);
  const now = new Date();

  const initial = {
    service: staff.service,
    fullName: staff.fullName,
    title: staff.title ?? '',
    bio: staff.bio ?? '',
    email: staff.email ?? '',
    mobile: staff.mobile ?? '',
    isActive: staff.isActive ? 'on' : '',
    sortOrder: String(staff.sortOrder),
  };

  return (
    <>
      <AdminHeading title={`${staff.fullName} — ${serviceLabel[staff.service]}`}>
        <ConfirmButton
          action={deleteStaffAction.bind(null, staff.id)}
          message={`پروفایل «${staff.fullName}» حذف شود؟`}
        >
          حذف پروفایل
        </ConfirmButton>
      </AdminHeading>
      {saved ? (
        <p
          role="status"
          className="mb-4 rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
        >
          ذخیره شد.
        </p>
      ) : null}
      {inUse ? (
        <p
          role="status"
          className="mb-4 rounded-control border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
        >
          این پروفایل نوبت ثبت‌شده دارد و حذف نمی‌شود؛ به‌جای حذف، آن را غیرفعال کنید.
        </p>
      ) : null}
      <StaffForm
        key={staff.updatedAt.toISOString()}
        id={staff.id}
        initial={initial}
        photoUrl={
          staff.photoKey
            ? `/admin/appointments/staff/${staff.id}/photo/sm?v=${staffPhotoUrl(staff.photoKey)?.split('/')[2]}`
            : null
        }
      />

      <section aria-labelledby="add-slot" className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="rounded-panel border border-line bg-white p-6">
          <h2 id="add-slot" className="mb-4 font-bold text-brand-900">
            افزودن یک نوبت
          </h2>
          <SingleSlotForm staffId={staff.id} />
        </div>
        <div className="rounded-panel border border-line bg-white p-6">
          <h2 className="mb-1 font-bold text-brand-900">ساخت نوبت‌های هفتگی</h2>
          <p className="mb-4 text-xs text-ink-2">
            در هر روز انتخاب‌شده، از ساعت شروع تا پایان، نوبت‌های پشت‌سرهم ساخته می‌شود. نوبت‌هایی
            که با نوبت‌های موجود هم‌پوشانی دارند ساخته نمی‌شوند.
          </p>
          <SlotSeriesForm staffId={staff.id} />
        </div>
      </section>

      <section aria-labelledby="slots-heading" className="mt-8">
        <h2 id="slots-heading" className="mb-3 text-lg font-bold text-brand-900">
          نوبت‌ها ({formatNumber(slots.length)})
        </h2>
        {slots.length === 0 ? (
          <EmptyState>نوبتی ساخته نشده است.</EmptyState>
        ) : (
          <Table head={['روز', 'ساعت', 'مکان', 'رزرو', '']}>
            {slots.map((slot) => {
              const live = slot.bookings.find((b) => b.status !== 'CANCELLED');
              const past = slot.startsAt <= now;
              return (
                <tr key={slot.id} className={slot.isCancelled || past ? 'text-ink-2' : undefined}>
                  <Td>{formatWeekdayDate(slot.startsAt)}</Td>
                  <Td>
                    {formatTime(slot.startsAt)} تا {formatTime(slot.endsAt)}
                  </Td>
                  <Td>{slot.location ?? '—'}</Td>
                  <Td>
                    {slot.isCancelled ? (
                      'نوبت لغو شده'
                    ) : live ? (
                      <div className="space-y-1">
                        <p>
                          <span className="font-medium">{live.fullName}</span>{' '}
                          <span dir="ltr">{toPersianDigits(live.phone)}</span>
                        </p>
                        <p className="text-xs">{live.topic}</p>
                        <BookingStatusForm
                          action={setBookingStatusAction.bind(null, live.id)}
                          current={live.status}
                        />
                      </div>
                    ) : (
                      <span className="text-success">{past ? 'خالی ماند' : 'خالی'}</span>
                    )}
                    {slot.bookings
                      .filter((b) => b.status === 'CANCELLED')
                      .map((b) => (
                        <p key={b.id} className="text-xs text-ink-2">
                          {b.fullName}: {bookingStatusLabel[b.status]}
                        </p>
                      ))}
                  </Td>
                  <Td>
                    {slot.isCancelled || past ? null : slot.bookings.length === 0 ? (
                      <ConfirmButton
                        action={deleteSlotAction.bind(null, slot.id)}
                        message="این نوبت حذف شود؟"
                      >
                        حذف
                      </ConfirmButton>
                    ) : (
                      <ConfirmButton
                        action={cancelSlotAction.bind(null, slot.id)}
                        message={
                          live
                            ? `این نوبت لغو شود؟ رزرو «${live.fullName}» هم لغو و به او اطلاع داده می‌شود.`
                            : 'این نوبت لغو شود؟'
                        }
                        className={dangerButtonClass}
                      >
                        لغو نوبت
                      </ConfirmButton>
                    )}
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </section>
    </>
  );
}
