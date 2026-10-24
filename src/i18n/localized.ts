// Content fields written in both languages. French is the source: it replaces an empty English field.

import type { Locale } from './locales.ts';

export interface LocalizedField {
  fr: string;
  en?: string | null | undefined;
}

export interface LocalizedText {
  text: string;
  /** Language of the text actually shown. */
  lang: Locale;
  /** True when the French text stands in for a missing English one. */
  fallback: boolean;
}

export function pickLocalized(field: LocalizedField, locale: Locale): LocalizedText {
  const own = locale === 'fr' ? field.fr : field.en;
  if (own !== undefined && own !== null && own.trim() !== '') {
    return { text: own, lang: locale, fallback: false };
  }
  return { text: field.fr, lang: 'fr', fallback: locale !== 'fr' };
}
