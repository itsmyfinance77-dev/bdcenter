import { notFound } from 'next/navigation';
import { AutoRefresh } from '@/components/admin/auto-refresh';
import { ConfirmButton } from '@/components/admin/confirm-button';
import { AdminHeading, EmptyState, secondaryButtonClass } from '@/components/admin/ui';
import { smsSandboxCopy as copy } from '@/content/admin';
import { formatDateTime, toPersianDigits } from '@/lib/format';
import { mobilePhone } from '@/lib/validation';
import { requireAdmin } from '@/modules/auth/service';
import { listSandboxSms, smsSandboxEnabled } from '@/modules/messaging/sandbox';
import { clearSandboxSmsAction } from './actions';

export const metadata = { title: copy.title };

export default async function SmsSandboxPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  await requireAdmin('ADMIN');
  if (!smsSandboxEnabled()) notFound();
  const raw = (await searchParams).phone;
  const parsed = mobilePhone.safeParse(typeof raw === 'string' ? raw.slice(0, 20) : undefined);
  const phone = parsed.success ? parsed.data : undefined;
  const messages = await listSandboxSms(phone);

  return (
    <>
      <AutoRefresh />
      <AdminHeading title={copy.title}>
        {messages.length > 0 ? (
          <ConfirmButton action={clearSandboxSmsAction} message={copy.clearConfirm}>
            {copy.clear}
          </ConfirmButton>
        ) : null}
      </AdminHeading>
      <p className="mb-4 rounded-control border border-warning/40 bg-warning/10 px-4 py-3 text-sm leading-7 text-ink">
        {copy.lead}
      </p>
      <form className="mb-4 flex flex-wrap items-center gap-2" role="search">
        <label className="text-sm text-ink-2" htmlFor="sandbox-phone">
          {copy.filterLabel}
        </label>
        <input
          id="sandbox-phone"
          name="phone"
          dir="ltr"
          inputMode="tel"
          defaultValue={phone ?? ''}
          placeholder="09…"
          className="w-48 rounded-control border border-line bg-white px-3 py-2 text-sm"
        />
        <button type="submit" className={secondaryButtonClass}>
          {copy.filter}
        </button>
        {phone ? (
          <a href="/admin/sms-sandbox" className="text-sm text-primary hover:underline">
            {copy.showAll}
          </a>
        ) : null}
      </form>
      {messages.length === 0 ? (
        <EmptyState>{copy.empty}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className="rounded-panel border border-line bg-white p-5"
              data-testid="sandbox-sms"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-ink" dir="ltr">
                  {toPersianDigits(message.phone)}
                </p>
                <time className="text-xs text-ink-2" dateTime={message.createdAt.toISOString()}>
                  {formatDateTime(message.createdAt)}
                </time>
              </div>
              {message.code ? (
                <p className="mt-3 text-sm text-ink-2">
                  {copy.codeLabel}:{' '}
                  <span
                    dir="ltr"
                    className="select-all font-mono text-2xl font-bold tracking-[0.3em] text-brand-900"
                  >
                    {toPersianDigits(message.code)}
                  </span>
                </p>
              ) : null}
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink">{message.text}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
