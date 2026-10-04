import { notFound } from 'next/navigation';
import { NotificationList } from '@/components/admin/notification-list';
import { StatusForm } from '@/components/admin/status-form';
import { AdminHeading, Badge } from '@/components/admin/ui';
import { membershipTierLabel, requestStatusLabel } from '@/content/admin';
import { formatDateTime, toPersianDigits } from '@/lib/format';
import { getConsultingRequest } from '@/modules/consulting/service';
import { listNotifications } from '@/modules/notifications/service';
import { setConsultingStatusAction } from '../actions';

export const metadata = { title: 'درخواست مشاوره' };

export default async function ConsultingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const request = await getConsultingRequest((await params).id);
  const notifications = request ? await listNotifications('ConsultingRequest', [request.id]) : {};
  if (!request) notFound();

  const rows: [string, React.ReactNode][] = [
    ['نام و نام خانوادگی', request.fullName],
    ['نام شرکت', request.companyName ?? '—'],
    ['کد ملی / شناسه ملی', request.nationalId ? toPersianDigits(request.nationalId) : '—'],
    [
      'شماره تماس',
      <span key="phone" dir="ltr">
        {toPersianDigits(request.phone)}
      </span>,
    ],
    [
      'ایمیل',
      request.email ? (
        <span key="email" dir="ltr">
          {request.email}
        </span>
      ) : (
        '—'
      ),
    ],
    [
      'سطح عضویت',
      request.membershipTier
        ? membershipTierLabel[request.membershipTier]
        : 'در فهرست اعضا پیدا نشد',
    ],
    ['موضوع', request.topic],
    ['تاریخ ثبت', formatDateTime(request.createdAt)],
    ['ثبت از', request.memberId ? 'حساب کاربری عضو سایت' : 'فرم بدون ورود'],
  ];

  return (
    <>
      <AdminHeading title={`درخواست مشاوره: ${request.fullName}`}>
        <Badge tone={request.status}>{requestStatusLabel[request.status]}</Badge>
      </AdminHeading>
      <div className="space-y-6 rounded-panel border border-line bg-white p-6">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[180px_1fr]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-ink-2">{label}</dt>
              <dd className="text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        {request.description ? (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink">توضیحات</h2>
            <p className="whitespace-pre-line text-sm leading-7 text-ink">{request.description}</p>
          </div>
        ) : null}
        <StatusForm
          action={setConsultingStatusAction.bind(null, request.id)}
          current={request.status}
          notify
          survey
        />
        <NotificationList rows={notifications[request.id] ?? []} />
        <p className="text-xs text-ink-2">
          سطح عضویت فقط برای اطلاع ثبت می‌شود؛ قیمت‌گذاری بر اساس آن هنوز تعریف نشده است (OQ-BD-01).
        </p>
      </div>
    </>
  );
}
