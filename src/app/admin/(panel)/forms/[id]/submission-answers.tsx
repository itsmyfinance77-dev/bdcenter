import { toPersianDigits } from '@/lib/format';
import { storedFileSchema } from '@/modules/files/service';
import type { FieldType } from '@/modules/forms/fields';
import { displayValue, submissionFields } from '@/modules/forms/service';

/** Answers shown left to right (numbers and codes). */
const LTR_TYPES = new Set([
  'PHONE',
  'MOBILE',
  'NUMBER',
  'NATIONAL_CODE',
  'LEGAL_ID',
  'POSTAL_CODE',
  'TIME',
]);

const PREVIEW_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * The answers of one submission with the labels it was sent with. Files are
 * download links; with `preview`, images are also shown small.
 */
export function SubmissionAnswers({
  submission,
  fields,
  preview = false,
}: {
  submission: { id: string; data: unknown; fields: unknown };
  fields: { key: string; label: string; type: FieldType; settings?: unknown }[];
  preview?: boolean;
}) {
  const data = submission.data as Record<string, unknown>;
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[200px_1fr]">
      {submissionFields(submission, fields).map((field) => {
        const value = data[field.key];
        const file = storedFileSchema.safeParse(value);
        const href = `/admin/submissions/${submission.id}/files/${field.key}`;
        return (
          <div key={field.key} className="contents">
            <dt className="text-ink-2">{field.label}</dt>
            <dd className="whitespace-pre-line text-ink">
              {file.success ? (
                <span className="flex flex-col items-start gap-2">
                  {preview && PREVIEW_TYPES.has(file.data.mimeType) ? (
                    <a href={`${href}?view=1`} target="_blank" rel="noopener">
                      {/* Private upload behind the admin session: next/image cannot fetch it. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${href}?view=1`}
                        alt={`پیش‌نمایش ${file.data.originalName}`}
                        className="max-h-48 max-w-full rounded-control border border-line"
                      />
                    </a>
                  ) : null}
                  <a href={href} className="text-primary hover:underline">
                    دانلود {file.data.originalName}
                  </a>
                </span>
              ) : field.type === 'EMAIL' ? (
                <span dir="ltr">{displayValue(value, field) || '—'}</span>
              ) : LTR_TYPES.has(field.type) ? (
                <span dir="ltr">{toPersianDigits(displayValue(value, field)) || '—'}</span>
              ) : (
                toPersianDigits(displayValue(value, field)) || '—'
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
