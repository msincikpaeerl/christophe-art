// The route table: the one place where fixed page paths are translated.
// Content slugs (an artwork, a collection…) come after the page segment and are shared by both languages.

import type { Locale } from './locales.ts';

export const routes = {
  home: { fr: '', en: '' },
  gallery: { fr: 'galerie', en: 'gallery' },
  about: { fr: 'a-propos', en: 'about' },
  contact: { fr: 'contact', en: 'contact' },
  legalNotice: { fr: 'mentions-legales', en: 'legal-notice' },
  privacy: { fr: 'confidentialite', en: 'privacy' },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteKey = keyof typeof routes;

export const routeKeys = Object.keys(routes) as RouteKey[];

export interface ResolvedRoute {
  key: RouteKey;
  /** Content slugs after the page segment, for example the artwork of /fr/galerie/hex-tree. */
  rest: string[];
}

/** Address of a page in a language, for example `/fr/galerie` or `/en/gallery/hex-tree`. */
export function pathFor(key: RouteKey, locale: Locale, rest: readonly string[] = []): string {
  const segments = [routes[key][locale], ...rest.map(encodeURIComponent)].filter(
    (segment) => segment !== '',
  );
  return segments.length === 0 ? `/${locale}/` : `/${locale}/${segments.join('/')}`;
}

/** Finds the page behind the segments that follow the language prefix; undefined when unknown. */
export function resolveRoute(
  locale: Locale,
  segments: readonly string[],
): ResolvedRoute | undefined {
  const [first, ...rest] = segments.filter((segment) => segment !== '');
  if (first === undefined) return { key: 'home', rest: [] };
  const key = routeKeys.find(
    (candidate) => candidate !== 'home' && routes[candidate][locale] === first,
  );
  return key === undefined ? undefined : { key, rest };
}

/** The same page in both languages; `search` (the filters in the address) is kept. */
export function alternatesFor(route: ResolvedRoute, search = ''): Record<Locale, string> {
  return {
    fr: pathFor(route.key, 'fr', route.rest) + search,
    en: pathFor(route.key, 'en', route.rest) + search,
  };
}
