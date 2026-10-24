import { en } from './dictionaries/en.ts';
import { fr } from './dictionaries/fr.ts';
import type { Locale } from './locales.ts';
import type { MessageKey, Messages } from './messages.ts';

export const dictionaries: Record<Locale, Messages> = { fr, en };

/** The interface text for a key in a language. */
export function translate(locale: Locale, key: MessageKey): string {
  let node: unknown = dictionaries[locale];
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown>)[part];
  }
  return node as string;
}

/** A `t(key)` function bound to a language, for use in components. */
export function translator(locale: Locale): (key: MessageKey) => string {
  return (key) => translate(locale, key);
}
