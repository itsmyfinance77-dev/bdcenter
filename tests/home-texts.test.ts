import { describe, expect, it } from 'vitest';
import { defaultHomeTexts, parseHomeTexts, resolveHomeTexts } from '@/modules/settings/home-texts';

describe('home page texts', () => {
  it('falls back to the built-in text for anything not saved', () => {
    expect(resolveHomeTexts({})).toEqual(defaultHomeTexts);
    expect(resolveHomeTexts({ heroLead: 'جملهٔ تازه', heroTitle: '  ' })).toEqual({
      ...defaultHomeTexts,
      heroLead: 'جملهٔ تازه',
    });
  });

  it('stores only changed texts, tidied, and refuses overlong ones', () => {
    const { stored, errors } = parseHomeTexts({
      heroTitle: defaultHomeTexts.heroTitle,
      heroLead: '  جملهٔ\n تازه  ',
      aboutKicker: '',
      heroBadge: 'ب'.repeat(61),
    });
    expect(stored).toEqual({ heroLead: 'جملهٔ تازه' });
    expect(Object.keys(errors)).toEqual(['heroBadge']);
    expect(errors.heroBadge).toContain('۶۰');
  });
});
