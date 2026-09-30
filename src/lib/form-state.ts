/** Result shape every public form's server action returns to `useActionState`. */
export type FormState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | {
      status: 'error';
      message: string;
      errors: Record<string, string>;
      /** Echoed back because React resets the form after an action runs. */
      values: Record<string, string>;
    };

export const initialFormState: FormState = { status: 'idle' };

/** Name of the hidden honeypot input; bots fill it, people never see it. */
export const HONEYPOT_FIELD = 'website';

export const GENERIC_ERROR = 'لطفاً خطاهای فرم را برطرف کنید.';
export const SUCCESS_MESSAGE = 'درخواست شما با موفقیت ثبت شد.';

/** Text entries of a submitted form, keyed by input name. Files are skipped. */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === 'string' && !key.startsWith('$')) values[key] = value;
  }
  return values;
}

export function isSpam(formData: FormData): boolean {
  const trap = formData.get(HONEYPOT_FIELD);
  return typeof trap === 'string' && trap.trim() !== '';
}
