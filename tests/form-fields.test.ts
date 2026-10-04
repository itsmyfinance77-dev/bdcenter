import { describe, expect, it } from 'vitest';
import {
  answersFrom,
  displayAnswer,
  fileProblem,
  settingsProblem,
  valueSchema,
  type FieldType,
  type PublicFormField,
} from '@/modules/forms/fields';

const field = (type: FieldType, extra: Partial<PublicFormField> = {}): PublicFormField => ({
  key: 'f',
  label: 'فیلد',
  type,
  isRequired: false,
  options: [],
  settings: {},
  ...extra,
});

/** The stored value, or the first error message. */
function check(f: PublicFormField, value: unknown) {
  const result = valueSchema(f).safeParse(value);
  return result.success ? { value: result.data } : { error: result.error.issues[0]!.message };
}

describe('form field types', () => {
  it('normalizes Iranian identifiers typed in any digits', () => {
    expect(check(field('MOBILE'), '+98 912-345 6789')).toEqual({ value: '09123456789' });
    expect(check(field('MOBILE'), '۰۹۱۲۳۴۵۶۷۸۹')).toEqual({ value: '09123456789' });
    expect(check(field('MOBILE'), '0212345678')).toHaveProperty('error');
    expect(check(field('NATIONAL_CODE'), '۰۴۹۹۳۷۰۸۹۹')).toEqual({ value: '0499370899' });
    expect(check(field('NATIONAL_CODE'), '0499370898')).toHaveProperty('error');
    expect(check(field('LEGAL_ID'), '10380284790')).toEqual({ value: '10380284790' });
    expect(check(field('LEGAL_ID'), '10380284791')).toHaveProperty('error');
    expect(check(field('POSTAL_CODE'), '8915713456')).toEqual({ value: '8915713456' });
    expect(check(field('POSTAL_CODE'), '1111111111')).toHaveProperty('error');
  });

  it('reads Jalali dates and times', () => {
    expect(check(field('JALALI_DATE'), '۱۴۰۵/۷/۱۵')).toEqual({ value: '1405/07/15' });
    expect(check(field('JALALI_DATE'), '1405/12/30')).toHaveProperty('error'); // not a leap year
    expect(check(field('JALALI_DATE'), '1405/07/15 10:00')).toHaveProperty('error');
    expect(check(field('TIME'), '۹:۳۰')).toEqual({ value: '09:30' });
    expect(check(field('TIME'), '24:00')).toHaveProperty('error');
  });

  it('keeps choices to the options, one or several', () => {
    const options = ['الف', 'ب', 'ج'];
    expect(check(field('RADIO', { options }), 'ب')).toEqual({ value: 'ب' });
    expect(check(field('RADIO', { options }), 'د')).toHaveProperty('error');
    const multi = field('MULTI_CHOICE', { options, isRequired: true });
    expect(check(multi, ['الف', 'ج', 'الف'])).toEqual({ value: ['الف', 'ج'] });
    expect(check(multi, 'ب')).toEqual({ value: ['ب'] });
    expect(check(multi, undefined)).toEqual({
      error: 'دست‌کم یکی از گزینه‌های فیلد را انتخاب کنید.',
    });
    expect(check(multi, ['الف', 'د'])).toHaveProperty('error');
    expect(check(field('MULTI_CHOICE', { options }), undefined)).toEqual({ value: undefined });
  });

  it('applies the per-field limits', () => {
    const text = field('TEXT', { settings: { minLength: 3, maxLength: 5 } });
    expect(check(text, 'ab')).toEqual({ error: 'فیلد باید دست‌کم ۳ نویسه باشد.' });
    expect(check(text, 'abcdef')).toHaveProperty('error');
    expect(check(text, ' abcd ')).toEqual({ value: 'abcd' });
    const number = field('NUMBER', { settings: { min: 1, max: 10 } });
    expect(check(number, '۷')).toEqual({ value: 7 });
    expect(check(number, '11')).toEqual({ error: 'فیلد نباید بیشتر از ۱۰ باشد.' });
    const rating = field('RATING', { settings: { scale: 7 }, isRequired: true });
    expect(check(rating, '7')).toEqual({ value: 7 });
    expect(check(rating, '8')).toHaveProperty('error');
    expect(check(rating, '')).toEqual({ error: 'فیلد را وارد کنید.' });
  });

  it('limits uploads per field', () => {
    const pdf = { size: 2 * 1024 * 1024, type: 'application/pdf' };
    expect(fileProblem(pdf, {})).toBeNull();
    expect(fileProblem(pdf, { maxSizeMb: 1 })).toContain('۱ مگابایت');
    expect(fileProblem(pdf, { fileKinds: ['image'] })).toContain('تصویر');
    expect(fileProblem({ size: 1, type: 'image/png' }, { fileKinds: ['image', 'pdf'] })).toBeNull();
  });

  it('checks a field definition in the builder', () => {
    expect(settingsProblem('RADIO', {}, [])).toContain('گزینه');
    expect(settingsProblem('TEXT', { minLength: 5, maxLength: 2 }, [])).toContain('طول');
    expect(settingsProblem('SELECT', { defaultValue: 'x' }, ['a'])).toContain('پیش‌فرض');
    expect(settingsProblem('SELECT', { defaultValue: 'a' }, ['a'])).toBeNull();
  });

  it('shows answers readably and reads repeated form names as lists', () => {
    expect(displayAnswer(['الف', 'ب'])).toBe('الف، ب');
    expect(displayAnswer(4, 'RATING', { scale: 5 })).toBe('۴ از ۵');
    expect(displayAnswer(true)).toBe('بله');
    expect(displayAnswer(undefined)).toBe('');

    const data = new FormData();
    data.append('choice', 'الف');
    data.append('choice', 'ب');
    data.append('name', 'سارا');
    expect(answersFrom(data)).toEqual({ choice: ['الف', 'ب'], name: 'سارا' });
  });
});
