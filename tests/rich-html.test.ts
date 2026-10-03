import { describe, expect, it } from 'vitest';
import { richHtmlToText, sanitizeRichHtml } from '@/lib/rich-html';

describe('rich page HTML', () => {
  it('keeps the formatting the editor produces', () => {
    const html =
      '<h2 style="text-align: center">عنوان</h2>' +
      '<p style="text-align: justify"><strong>پررنگ</strong> <em>کج</em> <u>زیرخط</u> <s>خط</s></p>' +
      '<p><span style="font-family: var(--font-anjoman); font-size: 24px; color: #1450c8">متن</span>' +
      '<span style="background-color: #fff3a3">زمینه</span></p>' +
      '<ul><li><p>یک</p></li></ul><ol><li><p>دو</p></li></ol><blockquote><p>نقل</p></blockquote><hr>' +
      '<table><tbody><tr><th colspan="2"><p>سر</p></th></tr><tr><td><p>خانه</p></td><td><p>دو</p></td></tr></tbody></table>' +
      '<img src="/page-images/cmabc1234567890abcdefghij/lg" alt="عکس">';
    const clean = sanitizeRichHtml(html);
    expect(clean).toContain('<h2 style="text-align:center">');
    expect(clean).toContain('font-family:var(--font-anjoman)');
    expect(clean).toContain('font-size:24px');
    expect(clean).toContain('color:#1450c8');
    expect(clean).toContain('background-color:#fff3a3');
    expect(clean).toContain('<th colspan="2">');
    expect(clean).toContain('<img src="/page-images/cmabc1234567890abcdefghij/lg" alt="عکس" />');
    expect(clean).toContain('<ul>');
    expect(clean).toContain('<blockquote>');
  });

  it('drops scripts, handlers, frames and outside images', () => {
    const clean = sanitizeRichHtml(
      '<p onclick="alert(1)">x</p><script>alert(1)</script><iframe src="https://evil.test"></iframe>' +
        '<img src="https://evil.test/track.png"><img src="/page-images/x/lg" onerror="alert(1)">' +
        '<a href="javascript:alert(1)">bad</a><style>p{}</style>',
    );
    expect(clean).not.toMatch(/script|onclick|onerror|iframe|evil|javascript|<style|<img/i);
    expect(clean).toContain('<p>x</p>');
  });

  it('refuses styles the editor does not offer', () => {
    const clean = sanitizeRichHtml(
      '<p style="position: fixed; text-align: center"><span style="font-family: Comic Sans; font-size: 300px; background: url(https://evil.test)">x</span></p>',
    );
    expect(clean).toBe('<p style="text-align:center"><span>x</span></p>');
  });

  it('opens outside links in a new tab without the referrer', () => {
    expect(sanitizeRichHtml('<a href="https://yazdccima.com">اتاق</a>')).toBe(
      '<a href="https://yazdccima.com" target="_blank" rel="noopener noreferrer nofollow">اتاق</a>',
    );
    expect(sanitizeRichHtml('<a href="/courses" target="_top">دوره‌ها</a>')).toBe(
      '<a href="/courses">دوره‌ها</a>',
    );
  });

  it('turns HTML into plain text for search and excerpts', () => {
    expect(richHtmlToText('<h2>تیتر</h2><p>یک &amp; دو</p><ul><li>سه</li></ul>')).toBe(
      'تیتر یک & دو سه',
    );
    expect(richHtmlToText('<p></p>')).toBe('');
  });
});
