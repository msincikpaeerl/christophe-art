// Prices, dimensions and dates, formatted for the page language (1 200 € in French, €1,200 in English).

import type { Locale } from './locales.ts';
import { translate } from './translate.ts';

const intlLocale: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB' };

export function formatPrice(amount: number, locale: Locale, currency = 'EUR'): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale[locale], { maximumFractionDigits: 1 }).format(value);
}

/** Long date, for example "24 octobre 2026" or "24 October 2026". */
export function formatDate(date: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(date),
  );
}

export interface Dimensions {
  height?: number | undefined;
  width?: number | undefined;
  depth?: number | undefined;
}

/** Engraved-plate line in centimetres: "H 62 × W 48 × D 20 cm" or "H 62 × L 48 × P 20 cm". */
export function formatDimensions(dimensions: Dimensions, locale: Locale): string {
  const parts: string[] = [];
  if (dimensions.height !== undefined) {
    parts.push(
      `${translate(locale, 'dimensions.height')} ${formatNumber(dimensions.height, locale)}`,
    );
  }
  if (dimensions.width !== undefined) {
    parts.push(
      `${translate(locale, 'dimensions.width')} ${formatNumber(dimensions.width, locale)}`,
    );
  }
  if (dimensions.depth !== undefined) {
    parts.push(
      `${translate(locale, 'dimensions.depth')} ${formatNumber(dimensions.depth, locale)}`,
    );
  }
  return `${parts.join(' × ')} ${translate(locale, 'dimensions.unit')}`;
}
