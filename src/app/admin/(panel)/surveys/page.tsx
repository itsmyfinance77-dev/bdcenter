import Link from 'next/link';
import { AdminHeading, EmptyState, secondaryButtonClass, Table, Td } from '@/components/admin/ui';
import { surveyKindLabel } from '@/content/surveys';
import { formatDateTime, formatNumber, toPersianDigits } from '@/lib/format';
import { requireAdmin } from '@/modules/auth/service';
import {
  listSurveyAnswers,
  surveyFilterSchema,
  surveySummary,
  type SurveyFilter,
} from '@/modules/surveys/service';

export const metadata = { title: 'نظرسنجی‌ها' };

const average = (value: number | null) =>
  value === null ? '—' : formatNumber(Math.round(value * 10) / 10);

function filterHref(filter: SurveyFilter, base = '/admin/surveys') {
  const params = new URLSearchParams();
  if (filter.kind) params.set('kind', filter.kind);
  if (filter.groupId) params.set('group', filter.groupId);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export default async function SurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; group?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const filter = surveyFilterSchema.parse({ kind: query.kind, groupId: query.group });
  const [summary, answers] = await Promise.all([surveySummary(), listSurveyAnswers(filter)]);
  const filtered = Boolean(filter.kind || filter.groupId);
  const filterLabel = filter.groupId
    ? summary.find((row) => row.groupId === filter.groupId)?.groupLabel
    : filter.kind
      ? surveyKindLabel[filter.kind]
      : null;

  return (
    <>
      <AdminHeading title="نظرسنجی‌ها">
        <a href={filterHref(filter, '/admin/surveys/export')} className={secondaryButtonClass}>
          خروجی Excel (CSV)
        </a>
      </AdminHeading>
      <p className="mb-6 text-sm leading-7 text-ink-2">
        وقتی درخواست مشاوره، نوبت یا ثبت‌نام دوره را «انجام شده» کنید و تیک «ارسال پیامک نظرسنجی»
        روشن باشد، برای آن شخص پیوند یک نظرسنجی کوتاه (نمره ۱ تا ۵ و توضیح) فرستاده می‌شود. نتیجه‌ها
        اینجا جمع می‌شوند.
      </p>

      <section aria-labelledby="summary-heading" className="mb-8">
        <h2 id="summary-heading" className="mb-3 font-bold text-brand-900">
          خلاصه
        </h2>
        {summary.length === 0 ? (
          <EmptyState>هنوز نظرسنجی‌ای فرستاده نشده است.</EmptyState>
        ) : (
          <Table head={['بخش', 'دوره یا مشاور', 'فرستاده', 'پاسخ', 'میانگین نمره', '']}>
            {summary.map((row) => (
              <tr key={`${row.kind}-${row.groupId ?? ''}`}>
                <Td>{surveyKindLabel[row.kind]}</Td>
                <Td>{row.groupLabel ?? '—'}</Td>
                <Td>{formatNumber(row.sent)}</Td>
                <Td>{formatNumber(row.answered)}</Td>
                <Td>
                  <span className="font-bold text-brand-900">{average(row.average)}</span>
                  {row.average === null ? null : <span className="text-ink-2"> از ۵</span>}
                </Td>
                <Td>
                  {row.answered > 0 ? (
                    <Link
                      href={filterHref(row.groupId ? { groupId: row.groupId } : { kind: row.kind })}
                      className="text-sm text-primary hover:underline"
                    >
                      پاسخ‌ها
                    </Link>
                  ) : null}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section aria-labelledby="answers-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="answers-heading" className="font-bold text-brand-900">
            {filterLabel ? `پاسخ‌ها: ${filterLabel}` : 'آخرین پاسخ‌ها'}
          </h2>
          {filtered ? (
            <Link href="/admin/surveys" className="text-sm text-primary hover:underline">
              همهٔ پاسخ‌ها
            </Link>
          ) : null}
        </div>
        {answers.length === 0 ? (
          <EmptyState>پاسخی نیست.</EmptyState>
        ) : (
          <Table head={['نمره', 'موضوع', 'توضیح', 'شماره همراه', 'زمان پاسخ']}>
            {answers.map((answer) => (
              <tr key={answer.id}>
                <Td>
                  <span className="text-lg font-extrabold text-brand-900">
                    {formatNumber(answer.score ?? 0)}
                  </span>
                </Td>
                <Td>
                  <span className="block text-xs text-ink-2">{surveyKindLabel[answer.kind]}</span>
                  {answer.subject}
                </Td>
                <Td>
                  <span className="block max-w-md whitespace-pre-line">
                    {answer.comment ?? '—'}
                  </span>
                </Td>
                <Td>
                  <span dir="ltr">{toPersianDigits(answer.phone)}</span>
                </Td>
                <Td>{answer.answeredAt ? formatDateTime(answer.answeredAt) : ''}</Td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </>
  );
}
