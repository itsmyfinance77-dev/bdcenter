import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminHeading, dangerButtonClass, secondaryButtonClass } from '@/components/admin/ui';
import { approvalLabel, personTypeLabel } from '@/content/members';
import { formatDateTime, toPersianDigits } from '@/lib/format';
import { requireAdmin } from '@/modules/auth/service';
import { getMemberForAdmin } from '@/modules/members/service';
import { setMemberActiveAction } from '../actions';
import { ReviewForm } from './review-form';

export const metadata = { title: 'مشخصات عضو' };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="text-sm text-ink">{children ?? '—'}</dd>
    </div>
  );
}

const digits = (value: string | null) =>
  value ? <span dir="ltr">{toPersianDigits(value)}</span> : '—';

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin('ADMIN');
  const { id } = await params;
  const member = await getMemberForAdmin(id);
  if (!member) notFound();
  const fileUrl = (kind: 'letter' | 'nationalCard') => `/admin/members/${member.id}/files/${kind}`;
  const isImage = (mime: string) => mime === 'image/jpeg' || mime === 'image/png';

  return (
    <>
      <AdminHeading title={member.fullName ?? toPersianDigits(member.phone)}>
        <Link href="/admin/members" className={secondaryButtonClass}>
          بازگشت به فهرست
        </Link>
        <form action={setMemberActiveAction.bind(null, member.id, !member.isActive)}>
          <button
            type="submit"
            className={member.isActive ? dangerButtonClass : secondaryButtonClass}
          >
            {member.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
          </button>
        </form>
      </AdminHeading>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-panel border border-line bg-white p-6">
          <h2 className="mb-2 font-bold text-brand-900">اطلاعات عضو</h2>
          <dl className="divide-y divide-line">
            <Row label="شماره همراه">{digits(member.phone)}</Row>
            <Row label="نام و نام خانوادگی">{member.fullName}</Row>
            <Row label="کد ملی">{digits(member.nationalId)}</Row>
            <Row label="کد پستی">{digits(member.postalCode)}</Row>
            <Row label="ایمیل">{member.email ? <span dir="ltr">{member.email}</span> : null}</Row>
            <Row label="ثبت‌نام به‌عنوان">
              {member.personType ? personTypeLabel[member.personType] : 'تکمیل نشده'}
            </Row>
            <Row label="عضویت">{formatDateTime(member.createdAt)}</Row>
            <Row label="آخرین ورود">
              {member.lastLoginAt ? formatDateTime(member.lastLoginAt) : null}
            </Row>
            <Row label="وضعیت">{member.isActive ? 'فعال' : 'غیرفعال'}</Row>
            <Row label="تصویر کارت ملی">
              {member.nationalCard ? (
                isImage(member.nationalCard.mimeType) ? (
                  <a href={fileUrl('nationalCard')} target="_blank" rel="noopener">
                    {/* eslint-disable-next-line @next/next/no-img-element -- private admin-only file */}
                    <img
                      src={fileUrl('nationalCard')}
                      alt="تصویر کارت ملی"
                      className="max-h-56 rounded-card border border-line"
                    />
                  </a>
                ) : (
                  <a href={fileUrl('nationalCard')} className="text-primary hover:underline">
                    دریافت فایل
                  </a>
                )
              ) : (
                'بارگذاری نشده'
              )}
            </Row>
          </dl>
        </section>

        {member.personType === 'LEGAL' ? (
          <section className="space-y-6 rounded-panel border border-line bg-white p-6">
            <div>
              <h2 className="mb-2 font-bold text-brand-900">شخص حقوقی</h2>
              <dl className="divide-y divide-line">
                <Row label="نام شخص حقوقی">{member.companyName}</Row>
                <Row label="شناسه ملی">{digits(member.legalNationalId)}</Row>
                <Row label="وضعیت تأیید">
                  {approvalLabel[member.approval]}
                  {member.reviewedAt ? ` · ${formatDateTime(member.reviewedAt)}` : null}
                </Row>
                {member.approval === 'REJECTED' && member.approvalNote ? (
                  <Row label="دلیل رد">{member.approvalNote}</Row>
                ) : null}
                <Row label="معرفی‌نامه">
                  {member.letter ? (
                    isImage(member.letter.mimeType) ? (
                      <a href={fileUrl('letter')} target="_blank" rel="noopener">
                        {/* eslint-disable-next-line @next/next/no-img-element -- private admin-only file */}
                        <img
                          src={fileUrl('letter')}
                          alt="معرفی‌نامه"
                          className="max-h-80 rounded-card border border-line"
                        />
                      </a>
                    ) : (
                      <a href={fileUrl('letter')} className="text-primary hover:underline">
                        دریافت فایل PDF ({member.letter.originalName})
                      </a>
                    )
                  ) : (
                    'بارگذاری نشده'
                  )}
                </Row>
              </dl>
            </div>

            {member.colleagues.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">
                  افراد دیگری که از طرف همین شخص حقوقی ثبت‌نام کرده‌اند
                </h3>
                <ul className="space-y-1 text-sm">
                  {member.colleagues.map((colleague) => (
                    <li key={colleague.id}>
                      <Link
                        href={`/admin/members/${colleague.id}`}
                        className="text-primary hover:underline"
                      >
                        {colleague.fullName ?? toPersianDigits(colleague.phone)}
                      </Link>{' '}
                      <span className="text-xs text-ink-2">
                        ({approvalLabel[colleague.approval]})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <h3 className="mb-3 text-sm font-semibold text-ink">بررسی</h3>
              <ReviewForm key={member.id} memberId={member.id} />
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
