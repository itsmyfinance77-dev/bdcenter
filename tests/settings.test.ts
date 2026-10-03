import { describe, expect, it } from 'vitest';
import { contactInputSchema, parseHomeStats, parseRecipients } from '@/modules/settings/service';

describe('staff alert recipients', () => {
  it('splits mobile numbers and emails, normalizing digits and prefixes', () => {
    expect(parseRecipients('۰۹۱۲۱۲۳۴۵۶۷\n+989121234567, Staff@Example.com ؛ 09351112233')).toEqual({
      phones: ['09121234567', '09351112233'],
      emails: ['staff@example.com'],
      invalid: [],
    });
  });

  it('reports what it cannot read', () => {
    expect(parseRecipients('0912 abc').invalid).toEqual(['0912', 'abc']);
  });
});

describe('contact details', () => {
  it('needs an address and a phone; the rest is optional', () => {
    expect(contactInputSchema.safeParse({ address: '', phone: '035-91091050' }).success).toBe(
      false,
    );
    expect(contactInputSchema.parse({ address: 'یزد', phone: '035-91091050', email: '' })).toEqual({
      address: 'یزد',
      phone: '035-91091050',
    });
  });
});

describe('home-page figures', () => {
  it('keeps filled pairs, skips empty rows and flags half-filled ones', () => {
    expect(
      parseHomeStats({ label0: 'شرکت آموزش‌دیده', value0: '۱۲۰+', label2: '', value2: '' }),
    ).toEqual({ stats: [{ label: 'شرکت آموزش‌دیده', value: '۱۲۰+' }], errors: {} });
    expect(parseHomeStats({ value1: '9' }).errors).toHaveProperty('label1');
  });
});
