import { notifyCopy } from '@/content/notifications';
import { formatDateTime } from '@/lib/format';
import type { NotificationRow } from '@/modules/notifications/service';

/** Compact history of the SMS/email messages sent about one request. */
export function NotificationList({ rows }: { rows: NotificationRow[] }) {
  if (rows.length === 0) return null;
  return (
    <ul className="space-y-0.5 text-xs text-ink-2">
      {rows.map((row, index) => (
        <li key={index}>
          {notifyCopy.channel[row.channel]}:{' '}
          <span className={row.status === 'SENT' ? 'text-success' : 'text-danger'}>
            {notifyCopy.status[row.status]}
          </span>{' '}
          · {formatDateTime(row.createdAt)}
        </li>
      ))}
    </ul>
  );
}
