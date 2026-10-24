import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from './dictionaries/en.ts';
import { fr } from './dictionaries/fr.ts';
import { locales } from './locales.ts';
import { dictionaries, translate } from './translate.ts';

const srcDir = join(import.meta.dirname, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function flatten(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    flatten(value, prefix === '' ? key : `${prefix}.${key}`),
  );
}

const keysOf = { fr: flatten(fr).sort(), en: flatten(en).sort() };

describe('dictionaries', () => {
  it('have the same keys in both languages', () => {
    const missingInFrench = keysOf.en.filter((key) => !keysOf.fr.includes(key));
    const missingInEnglish = keysOf.fr.filter((key) => !keysOf.en.includes(key));
    expect({ missingInFrench, missingInEnglish }).toEqual({
      missingInFrench: [],
      missingInEnglish: [],
    });
  });

  it('have no empty text', () => {
    for (const locale of locales) {
      for (const key of keysOf[locale]) {
        expect(translate(locale, key as never).trim(), `${locale}: ${key}`).not.toBe('');
      }
    }
  });

  it('are all used by the code, in at least one place outside the dictionaries', () => {
    const sources = walk(srcDir)
      .filter(
        (path) =>
          /\.(astro|ts)$/.test(path) &&
          !/\.test\.ts$/.test(path) &&
          !relative(srcDir, path).startsWith(join('i18n', 'dictionaries')),
      )
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    const unused = keysOf.en.filter(
      (key) => !sources.includes(`'${key}'`) && !sources.includes(`"${key}"`),
    );
    expect(unused).toEqual([]);
  });

  it('translates a key in each language', () => {
    expect(translate('fr', 'nav.gallery')).toBe('Galerie');
    expect(translate('en', 'nav.gallery')).toBe('Gallery');
    expect(dictionaries.fr).toBe(fr);
  });
});
