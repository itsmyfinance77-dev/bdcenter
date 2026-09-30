import { AdminHeading, EmptyState, Pager } from '@/components/admin/ui';
import { formatDateTime, toPersianDigits } from '@/lib/format';
import { pageParam } from '@/lib/params';
import { listContactMessages } from '@/modules/contact/service';

export const metadata = { title: 'پیام‌های تماس' };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = pageParam((await searchParams).page);
  const { items, pageCount } = await listContactMessages(page);

  return (
    <>
      <AdminHeading title="پیام‌های تماس" />
      {items.length === 0 ? (
        <EmptyState>هنوز پیامی نرسیده است.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((message) => (
            <li key={message.id} className="rounded-panel border border-line bg-white p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-ink">{message.fullName}</p>
                <time className="text-xs text-ink-2" dateTime={message.createdAt.toISOString()}>
                  {formatDateTime(message.createdAt)}
                </time>
              </div>
              <p className="mt-1 flex flex-wrap gap-4 text-xs text-ink-2">
                {message.phone ? <span dir="ltr">{toPersianDigits(message.phone)}</span> : null}
                {message.email ? (
                  <a href={`mailto:${message.email}`} dir="ltr" className="text-primary">
                    {message.email}
                  </a>
                ) : null}
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink">
                {message.message}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pageCount={pageCount} basePath="/admin/messages" />
    </>
  );
}
