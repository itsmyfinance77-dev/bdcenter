import {
  AdminHeading,
  dangerButtonClass,
  EmptyState,
  Pager,
  secondaryButtonClass,
  Table,
  Td,
} from '@/components/admin/ui';
import { formatDateTime, toPersianDigits } from '@/lib/format';
import { pageParam } from '@/lib/params';
import { requireAdmin } from '@/modules/auth/service';
import { listMembers } from '@/modules/members/service';
import { setMemberActiveAction } from './actions';

export const metadata = { title: 'اعضای سایت' };

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  await requireAdmin('ADMIN');
  const query = await searchParams;
  const page = pageParam(query.page);
  const q = typeof query.q === 'string' ? query.q.slice(0, 100) : '';
  const { items, pageCount } = await listMembers(page, q);

  return (
    <>
      <AdminHeading title="اعضای سایت" />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <label className="sr-only" htmlFor="members-q">
          جستجو
        </label>
        <input
          id="members-q"
          name="q"
          defaultValue={q}
          placeholder="شماره، نام یا شرکت"
          className="w-64 rounded-control border border-line bg-white px-3 py-2 text-sm"
        />
        <button type="submit" className={secondaryButtonClass}>
          جستجو
        </button>
      </form>
      {items.length === 0 ? (
        <EmptyState>عضوی پیدا نشد.</EmptyState>
      ) : (
        <Table head={['شماره همراه', 'نام', 'شرکت', 'عضویت', 'آخرین ورود', 'وضعیت']}>
          {items.map((member) => (
            <tr key={member.id}>
              <Td>
                <span dir="ltr">{toPersianDigits(member.phone)}</span>
              </Td>
              <Td>{member.fullName ?? '—'}</Td>
              <Td>{member.companyName ?? '—'}</Td>
              <Td>{formatDateTime(member.createdAt)}</Td>
              <Td>{member.lastLoginAt ? formatDateTime(member.lastLoginAt) : '—'}</Td>
              <Td>
                <form action={setMemberActiveAction.bind(null, member.id, !member.isActive)}>
                  <button
                    type="submit"
                    className={member.isActive ? dangerButtonClass : secondaryButtonClass}
                  >
                    {member.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                  </button>
                </form>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Pager
        page={page}
        pageCount={pageCount}
        basePath={q ? `/admin/members?q=${encodeURIComponent(q)}` : '/admin/members'}
      />
    </>
  );
}
