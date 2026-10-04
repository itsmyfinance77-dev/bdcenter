import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NotificationList } from '@/components/admin/notification-list';
import { StatusForm } from '@/components/admin/status-form';
import { AdminHeading, Badge } from '@/components/admin/ui';
import { requestStatusLabel } from '@/content/admin';
import { formatDateTime } from '@/lib/format';
import { getFormForAdmin, getSubmissionForAdmin, listStaff } from '@/modules/forms/service';
import { listNotifications } from '@/modules/notifications/service';
import {
  addSubmissionNoteAction,
  assignSubmissionAction,
  setSubmissionStatusAction,
} from '../../../actions';
import { SubmissionAnswers } from '../../submission-answers';
import { AssignForm, NoteForm } from './submission-forms';

export const metadata = { title: 'جزئیات درخواست فرم' };

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id, submissionId } = await params;
  const [form, submission, staff, notifications] = await Promise.all([
    getFormForAdmin(id),
    getSubmissionForAdmin(id, submissionId),
    listStaff(),
    listNotifications('FormSubmission', [submissionId]),
  ]);
  if (!form || !submission) notFound();
  const staffName = new Map(staff.map((s) => [s.id, s.fullName]));
  // A former staff member stays listed while still the assignee.
  const choices = staff.filter((s) => s.isActive || s.id === submission.assigneeId);

  return (
    <>
      <AdminHeading title={`درخواست «${form.title}»`}>
        <Badge tone={submission.status}>{requestStatusLabel[submission.status]}</Badge>
      </AdminHeading>
      <div className="space-y-6">
        <section className="space-y-4 rounded-panel border border-line bg-white p-6">
          <p className="text-xs text-ink-2">
            ثبت در{' '}
            <time dateTime={submission.createdAt.toISOString()}>
              {formatDateTime(submission.createdAt)}
            </time>
            {submission.memberId ? ' · از حساب کاربری عضو سایت' : ' · بدون ورود'}
          </p>
          <SubmissionAnswers submission={submission} fields={form.fields} preview />
        </section>

        <section
          aria-labelledby="follow-up"
          className="space-y-4 rounded-panel border border-line bg-white p-6"
        >
          <h2 id="follow-up" className="text-sm font-bold text-ink">
            پیگیری
          </h2>
          <StatusForm
            action={setSubmissionStatusAction.bind(null, submission.id, form.id)}
            current={submission.status}
            notify
          />
          <NotificationList rows={notifications[submission.id] ?? []} />
          <AssignForm
            action={assignSubmissionAction.bind(null, submission.id, form.id)}
            current={submission.assigneeId}
            staff={choices}
          />
        </section>

        <section
          aria-labelledby="notes"
          className="space-y-4 rounded-panel border border-line bg-white p-6"
        >
          <h2 id="notes" className="text-sm font-bold text-ink">
            یادداشت‌های کارمندان
          </h2>
          {submission.notes.length === 0 ? (
            <p className="text-sm text-ink-2">هنوز یادداشتی نوشته نشده است.</p>
          ) : (
            <ol className="space-y-3">
              {submission.notes.map((note) => (
                <li key={note.id} className="rounded-control bg-surface p-3 text-sm">
                  <p className="mb-1 text-xs text-ink-2">
                    {staffName.get(note.authorId) ?? 'کاربر حذف‌شده'} ·{' '}
                    <time dateTime={note.createdAt.toISOString()}>
                      {formatDateTime(note.createdAt)}
                    </time>
                  </p>
                  <p className="whitespace-pre-line leading-7 text-ink">{note.body}</p>
                </li>
              ))}
            </ol>
          )}
          <NoteForm action={addSubmissionNoteAction.bind(null, submission.id, form.id)} />
        </section>
      </div>
      <p className="mt-6 text-xs text-ink-2">
        <Link href={`/admin/forms/${form.id}`} className="text-primary">
          بازگشت به درخواست‌های این فرم
        </Link>
      </p>
    </>
  );
}
