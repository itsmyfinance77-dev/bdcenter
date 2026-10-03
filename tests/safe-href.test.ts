import { describe, expect, it } from 'vitest';
import { isExternalHref, isSafeHref } from '@/lib/safe-href';
import { parseSiteMenu } from '@/modules/settings/service';

describe('links typed by staff', () => {
  it('accepts site paths and http(s) addresses', () => {
    for (const href of ['/', '/news', '/pages/درباره?x=1#y', 'https://yazdcc.ir/a', 'http://a.b']) {
      expect(isSafeHref(href), href).toBe(true);
    }
  });

  it('refuses links that would leave the site unexpectedly or run script', () => {
    for (const href of [
      '//evil.example',
      '/\\evil.example',
      '/\\/evil.example',
      'javascript:alert(1)',
      'data:text/html,x',
      'news',
      'https://',
      'https:\\\\evil.example',
      '/a b',
      '',
    ]) {
      expect(isSafeHref(href), href).toBe(false);
    }
  });

  it('tells other sites from this one, whatever the letter case', () => {
    for (const href of ['https://a.b', 'HTTPS://a.b', 'Http://a.b']) {
      expect(isExternalHref(href), href).toBe(true);
    }
    for (const href of ['/news', '/https://a.b']) {
      expect(isExternalHref(href), href).toBe(false);
    }
  });

  it('applies to the menu editor', () => {
    const { errors } = parseSiteMenu({ m0title: 'بیرون', m0href: '/\\evil.example' });
    expect(errors).toHaveProperty('m0href');
  });
});
