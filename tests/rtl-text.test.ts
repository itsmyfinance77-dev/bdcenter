import { describe, expect, it } from 'vitest';
import { directionRuns, layoutLine, wrapText, type Piece } from '@/lib/rtl-text';

/** The drawn strings of a line, left to right, with spaces as " ". */
function drawn(line: string): string[] {
  return layoutLine(line).map((piece: Piece) =>
    piece.kind === 'space' ? ' '.repeat(piece.count) : piece.text,
  );
}

const reverse = (text: string) => Array.from(text).reverse().join('');

describe('direction runs', () => {
  it('keeps numbers and Latin words as left-to-right runs inside Persian text', () => {
    expect(directionRuns('دوره Excel پیشرفته به مدت ۲۴ ساعت')).toEqual([
      { text: 'دوره ', direction: 'rtl' },
      { text: 'Excel', direction: 'ltr' },
      { text: ' پیشرفته به مدت ', direction: 'rtl' },
      { text: '۲۴', direction: 'ltr' },
      { text: ' ساعت', direction: 'rtl' },
    ]);
  });

  it('keeps a date with separators in one number run, and joins Latin words across spaces', () => {
    expect(directionRuns('تاریخ: ۱۴۰۵/۰۷/۱۰')).toEqual([
      { text: 'تاریخ: ', direction: 'rtl' },
      { text: '۱۴۰۵/۰۷/۱۰', direction: 'ltr' },
    ]);
    expect(directionRuns('آموزش Microsoft Excel')[1]).toEqual({
      text: 'Microsoft Excel',
      direction: 'ltr',
    });
  });
});

describe('line layout', () => {
  it('orders Persian words right to left, one word per piece', () => {
    // Visual left-to-right order is the reverse of reading order.
    expect(drawn('گواهی پایان دوره')).toEqual(['دوره', ' ', 'پایان', ' ', 'گواهی']);
  });

  it('places numbers and Latin runs correctly and pre-reverses Persian digits for fontkit', () => {
    expect(drawn('به مدت ۲۴ ساعت')).toEqual(['ساعت', ' ', reverse('۲۴'), ' ', 'مدت', ' ', 'به']);
    expect(drawn('دوره Microsoft Excel')).toEqual(['Microsoft', ' ', 'Excel', ' ', 'دوره']);
    expect(drawn('شماره: BDC-7K2M-9QX4')).toEqual(['BDC-7K2M-9QX4', ' ', 'شماره:']);
    // Latin digits are left alone.
    expect(drawn('سال 2026')).toEqual(['2026', ' ', 'سال']);
  });

  it('mirrors brackets inside right-to-left text and drops explicit direction marks', () => {
    expect(drawn('(قابل استعلام)')).toEqual(['استعلام(', ' ', ')قابل']);
    expect(drawn(`${String.fromCharCode(0x200f)}۱۰ مهر`)).toEqual(['مهر', ' ', reverse('۱۰')]);
  });

  it('keeps zero-width non-joiners inside words', () => {
    const word = `کسب${String.fromCharCode(0x200c)}وکار`;
    expect(drawn(`مرکز ${word}`)).toEqual([word, ' ', 'مرکز']);
  });
});

describe('wrapping', () => {
  const measure = (text: string) => text.length; // one unit per character

  it('breaks at spaces within the width, in reading order', () => {
    expect(wrapText('یک دو سه چهار پنج', 8, measure)).toEqual(['یک دو سه', 'چهار پنج']);
  });

  it('gives an over-long word its own line and ignores extra whitespace', () => {
    expect(wrapText('  کوتاه   بسیاربسیاربلند  ', 5, measure)).toEqual(['کوتاه', 'بسیاربسیاربلند']);
    expect(wrapText('', 10, measure)).toEqual([]);
  });
});
