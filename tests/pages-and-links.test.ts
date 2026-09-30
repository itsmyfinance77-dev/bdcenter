import { describe, expect, it } from 'vitest';
import { plainExcerpt, plainText } from '@/lib/text';
import { isAllowedLinkUrl, linkInputSchema } from '@/modules/links/service';

describe('link addresses', () => {
  it('accepts http(s) and paths on this site', () => {
    for (const url of ['https://yazdccima.com/inter/', 'http://example.com', '/privacy']) {
      expect(isAllowedLinkUrl(url)).toBe(true);
    }
  });

  it('refuses scripts, other protocols and protocol-relative addresses', () => {
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,x',
      '//evil.example',
      '/\\evil.example',
      'ftp://x',
      'yazdccima.com',
    ]) {
      expect(isAllowedLinkUrl(url)).toBe(false);
    }
  });

  it('normalizes Persian digits in the order field', () => {
    const parsed = linkInputSchema.parse({
      section: 'useful-links',
      title: 'x',
      url: '/terms',
      sortOrder: '۲۰',
    });
    expect(parsed.sortOrder).toBe(20);
    expect(
      linkInputSchema.safeParse({ section: 'nope', title: 'x', url: '/', sortOrder: '' }).success,
    ).toBe(false);
  });
});

describe('plain text from Markdown', () => {
  it('drops formatting marks and keeps link text', () => {
    expect(plainText('## عنوان\n\n- **مورد** با [پیوند](https://x.ir)')).toBe(
      'عنوان - مورد با پیوند',
    );
  });

  it('cuts excerpts to 160 characters', () => {
    expect(plainExcerpt('الف '.repeat(100))).toHaveLength(160);
  });
});
