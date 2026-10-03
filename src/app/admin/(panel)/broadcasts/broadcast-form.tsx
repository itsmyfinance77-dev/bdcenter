'use client';

import { useActionState, useState } from 'react';
import { FormMessage, SubmitButton } from '@/components/form-controls';
import { broadcastAudienceLabel } from '@/content/admin';
import { actionResultKey, type FormState } from '@/lib/form-state';
import { sendBroadcastAction } from './actions';

type Audience = keyof typeof broadcastAudienceLabel;
type Course = { id: string; title: string; all: number; accepted: number };

const fa = (value: number) => new Intl.NumberFormat('fa-IR').format(value);
const controlClass =
  'block w-full rounded-control border-[1.5px] border-line bg-white px-3.5 py-2.5 text-[15px] text-ink focus:border-primary focus:outline-none';

/** Persian SMS parts: 70 characters fit in one, 67 per part when longer. */
function smsParts(length: number) {
  return length <= 70 ? 1 : Math.ceil(length / 67);
}

export function BroadcastForm({
  counts,
  courses,
  maxText,
}: {
  counts: Record<Exclude<Audience, 'course'>, number>;
  courses: Course[];
  maxText: number;
}) {
  const initialState: FormState = { status: 'error', message: '', errors: {}, values: {} };
  const [state, action] = useActionState(sendBroadcastAction, initialState);
  const [audience, setAudience] = useState<Audience>('members');
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [scope, setScope] = useState<'accepted' | 'all'>('accepted');
  const [text, setText] = useState('');
  const errors = state.status === 'error' ? state.errors : {};

  const course = courses.find((c) => c.id === courseId);
  const recipients =
    audience === 'course' ? (course ? course[scope] : 0) : counts[audience as keyof typeof counts];

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`این پیامک برای ${fa(recipients)} نفر فرستاده شود؟`)) {
          event.preventDefault();
        }
      }}
      className="space-y-4"
    >
      {state.status === 'success' || (state.status === 'error' && state.message) ? (
        <FormMessage state={state} />
      ) : null}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink">گیرندگان</legend>
        {(Object.keys(broadcastAudienceLabel) as Audience[]).map((value) => (
          <label key={value} className="flex items-center gap-2 text-sm text-ink">
            <input
              key={`${value}-${actionResultKey(state)}`}
              type="radio"
              name="audience"
              value={value}
              defaultChecked={audience === value}
              onChange={() => setAudience(value)}
              className="size-4 accent-primary"
            />
            {broadcastAudienceLabel[value]}
            {value !== 'course' ? (
              <span className="text-xs text-ink-2">({fa(counts[value])} نفر)</span>
            ) : null}
          </label>
        ))}
      </fieldset>
      {audience === 'course' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-semibold text-ink">
            <span>دوره</span>
            <select
              name="courseId"
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className={controlClass}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-ink">
            <span>کدام ثبت‌نام‌ها</span>
            <select
              name="scope"
              value={scope}
              onChange={(event) => setScope(event.target.value as 'accepted' | 'all')}
              className={controlClass}
            >
              <option value="accepted">
                پذیرفته‌شده و انجام‌شده ({fa(course?.accepted ?? 0)} نفر)
              </option>
              <option value="all">همه به‌جز ردشده‌ها ({fa(course?.all ?? 0)} نفر)</option>
            </select>
          </label>
          {errors.courseId ? (
            <p className="text-[13px] font-semibold text-danger">{errors.courseId}</p>
          ) : null}
        </div>
      ) : null}
      <label className="block space-y-1.5 text-sm font-semibold text-ink">
        <span>متن پیامک</span>
        <textarea
          name="text"
          rows={5}
          maxLength={maxText}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className={controlClass}
          aria-invalid={errors.text ? true : undefined}
        />
      </label>
      <p className="text-xs leading-6 text-ink-2">
        {fa(text.length)} از {fa(maxText)} حرف · {fa(smsParts(text.length))} پیامک برای هر نفر ·
        گیرندگان: {fa(recipients)} نفر. نام مرکز را در متن بیاورید تا گیرنده فرستنده را بشناسد.
      </p>
      {errors.text ? <p className="text-[13px] font-semibold text-danger">{errors.text}</p> : null}
      <SubmitButton>ارسال پیامک</SubmitButton>
    </form>
  );
}
