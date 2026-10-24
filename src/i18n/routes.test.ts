import { describe, expect, it } from 'vitest';
import { locales } from './locales.ts';
import { alternatesFor, pathFor, resolveRoute, routeKeys, routes } from './routes.ts';

describe('route table', () => {
  it('translates the fixed page paths', () => {
    expect(pathFor('gallery', 'fr')).toBe('/fr/galerie');
    expect(pathFor('gallery', 'en')).toBe('/en/gallery');
    expect(pathFor('home', 'fr')).toBe('/fr/');
    expect(pathFor('home', 'en')).toBe('/en/');
  });

  it('shares content slugs between both languages', () => {
    expect(pathFor('gallery', 'fr', ['hex-tree'])).toBe('/fr/galerie/hex-tree');
    expect(pathFor('gallery', 'en', ['hex-tree'])).toBe('/en/gallery/hex-tree');
  });

  it('gives every page a different path in each language', () => {
    for (const locale of locales) {
      const paths = routeKeys.map((key) => pathFor(key, locale));
      expect(new Set(paths).size).toBe(paths.length);
    }
  });

  it('only uses address-safe segments', () => {
    for (const key of routeKeys) {
      for (const locale of locales) expect(routes[key][locale]).toMatch(/^[a-z0-9-]*$/);
    }
  });

  it('resolves every path back to its page', () => {
    for (const key of routeKeys) {
      for (const locale of locales) {
        const segments = pathFor(key, locale).split('/').slice(2);
        expect(resolveRoute(locale, segments)).toEqual({ key, rest: [] });
      }
    }
  });

  it('does not resolve a page under the other language, or an unknown page', () => {
    expect(resolveRoute('en', ['galerie'])).toBeUndefined();
    expect(resolveRoute('fr', ['gallery'])).toBeUndefined();
    expect(resolveRoute('fr', ['nope'])).toBeUndefined();
  });

  it('keeps content slugs after the page', () => {
    expect(resolveRoute('fr', ['galerie', 'hex-tree'])).toEqual({
      key: 'gallery',
      rest: ['hex-tree'],
    });
  });

  it('builds the other language address of every page, filters included', () => {
    for (const key of routeKeys) {
      const search = '?category=sculpture&sort=recent';
      expect(alternatesFor({ key, rest: [] }, search)).toEqual({
        fr: pathFor(key, 'fr') + search,
        en: pathFor(key, 'en') + search,
      });
    }
  });
});
