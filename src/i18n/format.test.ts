import { describe, expect, it } from 'vitest';
import { formatDate, formatDimensions, formatPrice } from './format.ts';
import { pickLocalized } from './localized.ts';

// Intl uses narrow no-break spaces in French; compare with plain spaces.
const plain = (text: string) => text.replace(/\s/g, ' ');

describe('formatting for the page language', () => {
  it('formats prices', () => {
    expect(plain(formatPrice(1200, 'fr'))).toBe('1 200 €');
    expect(formatPrice(1200, 'en')).toBe('€1,200');
    expect(plain(formatPrice(1200.5, 'fr'))).toBe('1 200,50 €');
    expect(formatPrice(1200.5, 'en')).toBe('€1,200.50');
  });

  it('formats dimensions', () => {
    const size = { height: 62, width: 48.5, depth: 20 };
    expect(formatDimensions(size, 'en')).toBe('H 62 × W 48.5 × D 20 cm');
    expect(formatDimensions(size, 'fr')).toBe('H 62 × L 48,5 × P 20 cm');
    expect(formatDimensions({ height: 50, width: 100 }, 'en')).toBe('H 50 × W 100 cm');
  });

  it('formats dates', () => {
    expect(formatDate('2026-10-24', 'fr')).toBe('24 octobre 2026');
    expect(formatDate('2026-10-24', 'en')).toBe('24 October 2026');
  });
});

describe('pickLocalized', () => {
  it('uses the text of the page language', () => {
    expect(pickLocalized({ fr: 'Arbre', en: 'Tree' }, 'en')).toEqual({
      text: 'Tree',
      lang: 'en',
      fallback: false,
    });
    expect(pickLocalized({ fr: 'Arbre', en: 'Tree' }, 'fr').text).toBe('Arbre');
  });

  it.each([[''], ['   '], [null], [undefined]])(
    'falls back to French, marked as French, when the English text is %j',
    (en) => {
      expect(pickLocalized({ fr: 'Arbre', en }, 'en')).toEqual({
        text: 'Arbre',
        lang: 'fr',
        fallback: true,
      });
    },
  );

  it('does not mark French text on a French page', () => {
    expect(pickLocalized({ fr: 'Arbre' }, 'fr').fallback).toBe(false);
  });
});
