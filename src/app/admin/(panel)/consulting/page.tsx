import Link from 'next/link';
import {
  AdminHeading,
  Badge,
  EmptyState,
  Pager,
  secondaryButtonClass,
  Table,
  Td,
} from '@/components/admin/ui';
import { membershipTierLabel, requestStatusLabel } from '@/content/admin';
import { formatDateTime, toPersianDigits } from '@/lib/format';
import { pageParam } from '@/lib/params';
import {
  listConsultingRequests,
  requestStatusSchema,
  type RequestStatus,
} from '@/modules/consulting/service';
import { requireAdmin } from '@/modules/auth/service';

export const metadata = { title: 'درخواست‌های مشاوره' };

export default async function ConsultingListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const page = pageParam(query.page);
  const status = requestStatusSchema.safeParse(query.status).data;
  const { items, pageCount } = await listConsultingRequests(page, status);

  const filters: { value?: RequestStatus; label: string }[] = [
    { label: 'همه' },
    ...requestStatusSchema.options.map((value) => ({ value, label: requestStatusLabel[value] })),
  ];

  return (
    <>
      <AdminHeading title="درخواست‌های مشاوره">
        <a
          href={`/admin/consulting/export${status ? `?status=${status}` : ''}`}
          className={secondaryButtonClass}
        >
          خروجی Excel
        </a>
      </AdminHeading>
      <nav aria-label="فیلتر وضعیت" className="mb-4 flex flex-wrap gap-2 text-sm">
        {filters.map((filter) => {
          const active = filter.value === status;
          return (
            <Link
              key={filter.label}
              href={filter.value ? `/admin/consulting?status=${filter.value}` : '/admin/consulting'}
              aria-current={active ? 'true' : undefined}
              className={`rounded-chip border px-3 py-1 ${active ? 'border-primary bg-primary/10 text-primary' : 'border-line bg-white text-ink'}`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>
      {items.length === 0 ? (
        <EmptyState>درخواستی پیدا نشد.</EmptyState>
      ) : (
        <Table head={['متقاضی', 'موضوع', 'تماس', 'سطح عضویت', 'وضعیت', 'تاریخ']}>
          {items.map((request) => (
            <tr key={request.id}>
              <Td>
                <Link
                  href={`/admin/consulting/${request.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {request.fullName}
                </Link>
                {request.companyName ? (
                  <p className="text-xs text-ink-2">{request.companyName}</p>
                ) : null}
              </Td>
              <Td>{request.topic}</Td>
              <Td>
                <span dir="ltr">{toPersianDigits(request.phone)}</span>
              </Td>
              <Td>{request.membershipTier ? membershipTierLabel[request.membershipTier] : '—'}</Td>
              <Td>
                <Badge tone={request.status}>{requestStatusLabel[request.status]}</Badge>
              </Td>
              <Td>{formatDateTime(request.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      )}
      <Pager
        page={page}
        pageCount={pageCount}
        basePath={status ? `/admin/consulting?status=${status}` : '/admin/consulting'}
      />
    </>
  );
}
