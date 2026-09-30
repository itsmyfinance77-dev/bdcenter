import { describe, expect, it } from 'vitest';
import { normalizeSearchText, searchTerms } from '@/lib/search-text';

const ZWNJ = String.fromCharCode(0x200c);

describe('search normalization', () => {
  it('folds Arabic letters, half-spaces, digits and case', () => {
    expect(normalizeSearchText('كيك')).toBe('کیک');
    expect(normalizeSearchText(`کسب${ZWNJ}وکار`)).toBe('کسب وکار');
    expect(normalizeSearchText('Course 1405 ٣')).toBe('course ۱۴۰۵ ۳');
  });

  it('splits into words of two or more letters, at most six', () => {
    expect(searchTerms('  دوره «بازاریابی» و فروش ')).toEqual(['دوره', 'بازاریابی', 'فروش']);
    expect(searchTerms('a b')).toEqual([]);
    expect(searchTerms('یک دو سه چهار پنج شش هفت هشت')).toHaveLength(6);
  });

  it('caps the query length', () => {
    expect(searchTerms('ا'.repeat(500))[0]).toHaveLength(100);
  });
});
