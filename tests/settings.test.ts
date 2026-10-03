import { describe, expect, it } from 'vitest';
import {
  contactInputSchema,
  parseHomeStats,
  parseRecipients,
  parseSiteMenu,
} from '@/modules/settings/service';

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

describe('site menu', () => {
  it('keeps filled rows in order with internal or http(s) links', () => {
    const { menu, errors } = parseSiteMenu({
      s0title: 'دوره‌ها',
      s0href: '/courses',
      s0icon: 'cap',
      s1title: '',
      s1href: '',
      m0title: 'اتاق یزد',
      m0href: 'https://yazdccima.com',
    });
    expect(errors).toEqual({});
    expect(menu.services).toEqual([{ title: 'دوره‌ها', href: '/courses', icon: 'cap' }]);
    expect(menu.main).toEqual([{ title: 'اتاق یزد', href: 'https://yazdccima.com' }]);
  });

  it('refuses scripts, protocol-relative links and unknown icons', () => {
    const { menu, errors } = parseSiteMenu({
      m0title: 'بد',
      m0href: 'javascript:alert(1)',
      m1title: 'بد',
      m1href: '//evil.test',
      s0title: 'x',
      s0href: '/x',
      s0icon: 'nope',
    });
    expect(Object.keys(errors).sort()).toEqual(['m0href', 'm1href']);
    expect(menu.services[0]?.icon).toBe('link');
  });

  it('brings back the built-in menu on reset', () => {
    const { menu } = parseSiteMenu({ reset: '1' });
    expect(menu.main.map((item) => item.href)).toContain('/contact');
  });
});
