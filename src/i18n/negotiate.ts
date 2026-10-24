import { defaultLocale, isLocale, type Locale } from './locales.ts';

/** Picks the language from an Accept-Language header: the best supported one, French when none. */
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header) return defaultLocale;
  const candidates = header.split(',').map((part, index) => {
    const [tag = '', ...params] = part.trim().split(';');
    let quality = 1;
    for (const param of params) {
      const match = /^\s*q\s*=\s*(\d*\.?\d+)\s*$/i.exec(param);
      if (match?.[1] !== undefined) quality = Number(match[1]);
    }
    const language = tag.trim().toLowerCase().split('-')[0];
    return { language, quality, index };
  });
  candidates.sort((a, b) => b.quality - a.quality || a.index - b.index);
  for (const { language, quality } of candidates) {
    if (quality > 0 && isLocale(language)) return language;
  }
  return defaultLocale;
}
