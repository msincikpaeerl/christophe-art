import { describe, expect, it } from 'vitest';
import { negotiateLocale } from './negotiate.ts';

describe('negotiateLocale', () => {
  it.each([
    ['fr-FR,fr;q=0.9,en;q=0.8', 'fr'],
    ['en-GB,en;q=0.9', 'en'],
    ['en-US', 'en'],
    ['de-DE,en;q=0.5', 'en'],
    ['en;q=0.4,fr;q=0.8', 'fr'],
    ['EN', 'en'],
  ])('%s gives %s', (header, expected) => {
    expect(negotiateLocale(header)).toBe(expected);
  });

  it.each([[undefined], [null], [''], ['de-DE,es;q=0.8'], ['*'], ['fr;q=0,en;q=0']])(
    'gives French when nothing matches (%s)',
    (header) => {
      expect(negotiateLocale(header)).toBe('fr');
    },
  );

  it('ignores a language refused with q=0', () => {
    expect(negotiateLocale('fr;q=0,en;q=0.5')).toBe('en');
  });
});
