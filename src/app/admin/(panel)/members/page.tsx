import Link from 'next/link';
import {
  AdminHeading,
  EmptyState,
  Pager,
  secondaryButtonClass,
  Table,
  Td,
} from '@/components/admin/ui';
import { approvalLabel, personTypeLabel } from '@/content/members';
import { formatDateTime, formatNumber, toPersianDigits } from '@/lib/format';
import { pageParam } from '@/lib/params';
import { requireAdmin } from '@/modules/auth/service';
import { countPendingMembers, listMembers, type MemberListFilter } from '@/modules/members/service';
import { getSetting } from '@/modules/settings/service';
import { setNationalCardRequiredAction } from './actions';

export const metadata = { title: 'اعضای سایت' };

const approvalTone = {
  NOT_REQUIRED: 'text-ink-2',
  PENDING: 'font-semibold text-warning',
  APPROVED: 'text-success',
  REJECTED: 'text-danger',
} as const;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; filter?: string }>;
}) {
  await requireAdmin('ADMIN');
  const query = await searchParams;
  const page = pageParam(query.page);
  const q = typeof query.q === 'string' ? query.q.slice(0, 100) : '';
  const filter: MemberListFilter = query.filter === 'pending' ? 'pending' : 'all';
  const [{ items, pageCount }, pending, cardRequired] = await Promise.all([
    listMembers(page, q, filter),
    countPendingMembers(),
    getSetting('members.nationalCardRequired'),
  ]);

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (filter === 'pending') params.set('filter', 'pending');
  const basePath = `/admin/members${params.size > 0 ? `?${params}` : ''}`;
  const tab = (active: boolean) =>
    `rounded-control px-3 py-1.5 text-sm ${active ? 'bg-primary/10 font-semibold text-primary' : 'text-ink hover:bg-surface-2'}`;

  return (
    <>
      <AdminHeading title="اعضای سایت">
        <a href={`/admin/members/export`} download className={secondaryButtonClass}>
          خروجی Excel
        </a>
      </AdminHeading>

      <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-white px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-ink">تصویر کارت ملی هنگام ثبت‌نام</p>
          <p className="text-xs leading-6 text-ink-2">
            {cardRequired
              ? 'اکنون اجباری است: اعضا بدون بارگذاری تصویر کارت ملی نمی‌توانند در دوره‌ها ثبت‌نام کنند یا نوبت بگیرند.'
              : 'اکنون اختیاری است: اعضا می‌توانند تصویر کارت ملی را بارگذاری کنند، ولی لازم نیست.'}
          </p>
        </div>
        <form action={setNationalCardRequiredAction.bind(null, !cardRequired)}>
          <button type="submit" className={secondaryButtonClass}>
            {cardRequired ? 'اختیاری کن' : 'اجباری کن'}
          </button>
        </form>
      </section>

      <nav aria-label="فیلتر اعضا" className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/members" className={tab(filter === 'all')}>
          همه
        </Link>
        <Link href="/admin/members?filter=pending" className={tab(filter === 'pending')}>
          در انتظار تأیید ({formatNumber(pending)})
        </Link>
      </nav>

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        {filter === 'pending' ? <input type="hidden" name="filter" value="pending" /> : null}
        <label className="sr-only" htmlFor="members-q">
          جستجو
        </label>
        <input
          id="members-q"
          name="q"
          defaultValue={q}
          placeholder="شماره، نام، شرکت، کد یا شناسه ملی"
          className="w-72 rounded-control border border-line bg-white px-3 py-2 text-sm"
        />
        <button type="submit" className={secondaryButtonClass}>
          جستجو
        </button>
      </form>
      {items.length === 0 ? (
        <EmptyState>
          {filter === 'pending' ? 'عضوی در انتظار تأیید نیست.' : 'عضوی پیدا نشد.'}
        </EmptyState>
      ) : (
        <Table head={['شماره همراه', 'نام', 'نوع', 'شخص حقوقی', 'تأیید', 'عضویت', 'وضعیت']}>
          {items.map((member) => (
            <tr key={member.id}>
              <Td>
                <Link href={`/admin/members/${member.id}`} className="text-primary hover:underline">
                  <span dir="ltr">{toPersianDigits(member.phone)}</span>
                </Link>
              </Td>
              <Td>{member.fullName ?? '—'}</Td>
              <Td>{member.personType ? personTypeLabel[member.personType] : 'تکمیل نشده'}</Td>
              <Td>{member.companyName ?? '—'}</Td>
              <Td>
                <span className={approvalTone[member.approval]}>
                  {member.personType === 'LEGAL' ? approvalLabel[member.approval] : '—'}
                </span>
              </Td>
              <Td>{formatDateTime(member.createdAt)}</Td>
              <Td>{member.isActive ? 'فعال' : <span className="text-danger">غیرفعال</span>}</Td>
            </tr>
          ))}
        </Table>
      )}
      <Pager page={page} pageCount={pageCount} basePath={basePath} />
    </>
  );
}
