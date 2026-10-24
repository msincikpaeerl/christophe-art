// The languages of the public site. French is the default; the address is the only source of the language.

export const locales = ['fr', 'en'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

export function isLocale(value: string | undefined): value is Locale {
  return locales.some((locale) => locale === value);
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'fr' ? 'en' : 'fr';
}
