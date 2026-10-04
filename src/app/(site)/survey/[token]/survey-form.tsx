'use client';

import { useActionState } from 'react';
import { fieldState, FormMessage, SubmitButton, TextareaField } from '@/components/form-controls';
import { surveyCopy } from '@/content/surveys';
import { actionResultKey, initialFormState } from '@/lib/form-state';
import { answerSurveyAction } from './actions';

const scores = [1, 2, 3, 4, 5] as const;
const digits = new Intl.NumberFormat('fa-IR');

export function SurveyForm({ token }: { token: string }) {
  const [state, action] = useActionState(answerSurveyAction.bind(null, token), initialFormState);
  if (state.status === 'success') return <FormMessage state={state} />;

  const chosen = state.status === 'error' ? state.values.score : undefined;
  const scoreError = state.status === 'error' ? state.errors.score : undefined;
  // React resets the form after an action: remount the radios with the last choice.
  const key = actionResultKey(state);
  return (
    <form action={action} className="space-y-6" noValidate>
      {state.status === 'idle' ? null : <FormMessage state={state} />}
      <fieldset aria-describedby={scoreError ? 'score-error' : undefined}>
        <legend className="mb-3 text-[15px] font-bold text-ink">{surveyCopy.scoreLegend}</legend>
        <div className="grid grid-cols-5 gap-2">
          {scores.map((score) => (
            <label
              key={`${key}-${score}`}
              className="group flex cursor-pointer flex-col items-center gap-1 rounded-control border-[1.5px] border-line bg-white px-1 py-3 text-center transition-colors hover:border-primary has-checked:border-primary has-checked:bg-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
            >
              <input
                type="radio"
                name="score"
                value={score}
                defaultChecked={chosen === String(score)}
                className="sr-only"
              />
              <span className="text-2xl font-extrabold text-brand-900 group-has-checked:text-white">
                {digits.format(score)}
              </span>
              <span className="text-xs leading-5 text-ink-2 group-has-checked:text-white">
                {surveyCopy.scoreLabels[score]}
              </span>
            </label>
          ))}
        </div>
        {scoreError ? (
          <p id="score-error" className="mt-2 text-[13px] font-semibold text-danger">
            {scoreError}
          </p>
        ) : null}
      </fieldset>
      <TextareaField label={surveyCopy.commentLabel} rows={4} {...fieldState(state, 'comment')} />
      <SubmitButton>{surveyCopy.submit}</SubmitButton>
    </form>
  );
}
