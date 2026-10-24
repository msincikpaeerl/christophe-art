import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const srcDir = join(import.meta.dirname, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Public components and pages: everything in src except the development pages. */
const publicFiles = walk(srcDir).filter(
  (path) => path.endsWith('.astro') && !relative(srcDir, path).startsWith(join('pages', 'dev')),
);

/** Visible text and text attributes written directly in the markup of an Astro file. */
function hardCodedTexts(source: string): string[] {
  let markup = source
    .replace(/^---[\s\S]*?\n---/, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  // Removes expressions without markup inside, innermost first, so `{t('key')}` is not text.
  for (let previous = ''; previous !== markup;) {
    previous = markup;
    markup = markup.replace(/\{[^{}<>]*\}/g, ' ');
  }
  const found: string[] = [];
  for (const [, text] of markup.matchAll(/>([^<>]*)</g)) {
    // Text still holding a brace belongs to an expression that wraps markup, not to the page.
    if (text && !/[{}]/.test(text) && /\p{L}/u.test(text)) found.push(text.trim());
  }
  for (const [, , value] of markup.matchAll(
    /<[a-z][\w-]*\s[^>]*?\b(aria-label|alt|title|placeholder)="([^"]*)"/g,
  )) {
    if (value && /\p{L}/u.test(value)) found.push(value);
  }
  return found;
}

describe('hard-coded interface text', () => {
  it('finds the public files to check', () => {
    expect(publicFiles.length).toBeGreaterThan(5);
  });

  it('detects text and attributes written in a template', () => {
    expect(hardCodedTexts('---\nconst a = 1;\n---\n<p>Hello</p>')).toEqual(['Hello']);
    expect(hardCodedTexts('<img alt="A tree" src={x} />')).toEqual(['A tree']);
    expect(hardCodedTexts('<a aria-label="Menu">{t(\'k\')}</a>')).toEqual(['Menu']);
    expect(hardCodedTexts("<p>{t('k')} · {name}</p>")).toEqual([]);
    expect(hardCodedTexts('<ul>{items.map((i) => (<li>{i}</li>))}</ul>')).toEqual([]);
  });

  it('keeps public components and pages free of hard-coded text (use the dictionaries)', () => {
    const offenders = publicFiles.flatMap((path) =>
      hardCodedTexts(readFileSync(path, 'utf8')).map(
        (text) => `${relative(srcDir, path)}: ${text}`,
      ),
    );
    expect(offenders).toEqual([]);
  });
});
