import { describe, expect, it } from 'vitest';
import {
  answersFrom,
  CHECKED,
  conditionProblem,
  displayAnswer,
  fileProblem,
  formSteps,
  settingsProblem,
  visibleFieldKeys,
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
    // Persian keyboard: «٫» is the decimal mark, «٬» or «,» separate thousands.
    const decimal = String.fromCharCode(0x066b);
    const thousands = String.fromCharCode(0x066c);
    expect(check(field('NUMBER'), `۱۲${decimal}۵`)).toEqual({ value: 12.5 });
    expect(check(field('NUMBER'), `۱${thousands}۲۰۰`)).toEqual({ value: 1200 });
    expect(check(field('NUMBER'), '1,200.5')).toEqual({ value: 1200.5 });
    expect(check(field('NUMBER'), '-3')).toEqual({ value: -3 });
    expect(check(field('NUMBER'), 'abc')).toHaveProperty('error');
    // Separators that are not groups of three are refused, not guessed.
    expect(check(field('NUMBER'), ',')).toHaveProperty('error');
    expect(check(field('NUMBER'), thousands)).toHaveProperty('error');
    expect(check(field('NUMBER'), '12,5')).toHaveProperty('error');
    expect(check(field('NUMBER'), '1,20')).toHaveProperty('error');
    expect(check(field('NUMBER'), '12,345,678')).toEqual({ value: 12345678 });
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
    expect(settingsProblem('FILE', { prefill: 'fullName' }, [])).toContain('حساب عضو');
    expect(settingsProblem('MOBILE', { prefill: 'phone' }, [])).toBeNull();
    expect(settingsProblem('SELECT', { defaultValue: 'a' }, ['a'])).toBeNull();
    expect(settingsProblem('MULTI_CHOICE', { defaultValue: 'a' }, ['a'])).toContain('پیش‌فرض');
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

describe('conditions and steps', () => {
  const kind = field('RADIO', { key: 'kind', options: ['حقیقی', 'حقوقی'] });
  const company = field('TEXT', {
    key: 'company',
    settings: { showIf: { field: 'kind', value: 'حقوقی' } },
  });
  const agree = field('CHECKBOX', { key: 'agree' });
  // Shown only when «company» is shown and the box is ticked.
  const reg = field('TEXT', {
    key: 'reg',
    settings: { showIf: { field: 'agree', value: CHECKED } },
  });
  const nested = field('TEXT', {
    key: 'nested',
    settings: { showIf: { field: 'company', value: 'x' } },
  });
  const fields = [kind, company, agree, reg, nested];

  it('shows a field only while its condition holds, hiding what hangs on hidden fields', () => {
    expect([...visibleFieldKeys(fields, {})]).toEqual(['kind', 'agree']);
    expect([...visibleFieldKeys(fields, { kind: 'حقوقی', agree: 'on' })]).toEqual([
      'kind',
      'company',
      'agree',
      'reg',
    ]);
    expect([...visibleFieldKeys(fields, { kind: 'حقوقی', company: 'x' })]).toContain('nested');
    expect([...visibleFieldKeys(fields, { kind: 'حقیقی', company: 'x' })]).not.toContain('nested');
    const topics = field('MULTI_CHOICE', { key: 'topics', options: ['الف', 'ب'] });
    const more = field('TEXT', {
      key: 'more',
      settings: { showIf: { field: 'topics', value: 'ب' } },
    });
    expect(visibleFieldKeys([topics, more], { topics: ['الف', 'ب'] }).has('more')).toBe(true);
  });

  it('checks that a condition looks back at a choice or tick field and one of its options', () => {
    expect(conditionProblem(company, [kind])).toBeNull();
    expect(conditionProblem(company, [])).toContain('پیش از');
    expect(conditionProblem(nested, [kind, company])).toContain('گزینه‌ای');
    expect(
      conditionProblem(field('TEXT', { settings: { showIf: { field: 'kind', value: 'سوم' } } }), [
        kind,
      ]),
    ).toContain('یکی از گزینه‌ها');
    expect(conditionProblem(reg, [agree])).toBeNull();
    expect(settingsProblem('TEXT', { newPage: true }, [])).toContain('مرحلهٔ تازه');
    expect(settingsProblem('SECTION', { showIf: { field: 'kind', value: 'حقوقی' } }, [])).toContain(
      'شرط نمایش نمی‌گیرد',
    );
  });

  it('splits the form into steps at sections that start a new one', () => {
    const page = (key: string, label: string) =>
      field('SECTION', { key, label, settings: { newPage: true } });
    const plain = formSteps([kind, page('p2', 'مدارک'), company, field('SECTION', { key: 's' })]);
    expect(plain.titles).toEqual([null, 'مدارک']);
    expect([...plain.stepOf.values()]).toEqual([0, 1, 1, 1]);
    expect(formSteps([page('p1', 'اول'), kind, page('p2', 'دوم'), agree]).titles).toEqual([
      'اول',
      'دوم',
    ]);
    expect(formSteps([kind, agree]).titles).toEqual([null]);
  });
});
