import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const tokensFile = join(root, 'src', 'styles', 'tokens.css');
const tokensCss = readFileSync(tokensFile, 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Every `--name: value;` declaration in the tokens file (first one wins for repeated names). */
function declarations(css: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const [, name, value] of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    if (name && value && !found.has(name)) found.set(name, value.trim());
  }
  return found;
}
const tokens = declarations(tokensCss);

function resolve(name: string): string {
  let value = tokens.get(name);
  if (value === undefined) throw new Error(`Unknown token ${name}`);
  for (let depth = 0; depth < 5; depth++) {
    const reference = /^var\((--[\w-]+)\)$/.exec(value);
    if (!reference?.[1]) return value;
    const next = tokens.get(reference[1]);
    if (next === undefined) throw new Error(`Unknown token ${reference[1]}`);
    value = next;
  }
  throw new Error(`Token ${name} references too deeply`);
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const c = parseInt(hex.slice(start, start + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
}

function contrast(foreground: string, background: string): number {
  const a = luminance(resolve(foreground));
  const b = luminance(resolve(background));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('WCAG AA contrast', () => {
  const lightSurfaces = ['--surface-light', '--surface-light-raised'];
  const lightText = ['--text-on-light', '--text-muted-on-light', '--accent-on-light'];
  const darkText = ['--text-on-dark', '--text-muted-on-dark', '--accent-on-dark'];

  for (const surface of lightSurfaces) {
    for (const text of lightText) {
      it(`${text} on ${surface} reaches 4.5:1`, () => {
        expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  for (const text of darkText) {
    it(`${text} on --surface-dark reaches 4.5:1`, () => {
      expect(contrast(text, '--surface-dark')).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('the copper link colour on light backgrounds reaches 4.5:1', () => {
    expect(contrast('--color-copper-deep', '--color-gallery-white')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('--color-copper-deep', '--color-paper')).toBeGreaterThanOrEqual(4.5);
  });

  it('the focus ring is visible (3:1) on both kinds of surface', () => {
    expect(contrast('--color-copper-deep', '--surface-light')).toBeGreaterThanOrEqual(3);
    expect(contrast('--color-copper-bright', '--surface-dark')).toBeGreaterThanOrEqual(3);
  });
});

describe('tokens', () => {
  const sources = [
    ...walk(join(root, 'src')),
    ...walk(join(root, 'e2e')),
    ...walk(join(root, 'public')).filter((path) => path.endsWith('.svg')),
  ].filter(
    (path) =>
      /\.(css|astro|ts|js|svg|html)$/.test(path) &&
      !/\.test\.ts$/.test(path) &&
      path !== tokensFile,
  );

  it('finds source files to check', () => {
    expect(sources.length).toBeGreaterThan(5);
  });

  it('keeps raw colour values out of the code (they live in tokens.css only)', () => {
    const rawColour =
      /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|(?:color|background|fill|stroke|outline|border[\w-]*)\s*:\s*(?:white|black|red|green|blue|gray|grey|orange|yellow|purple|silver|navy|teal)\b/i;
    const offenders = sources
      .filter((path) => rawColour.test(readFileSync(path, 'utf8')))
      .map((path) => relative(root, path));
    expect(offenders).toEqual([]);
  });

  it('only uses tokens that are defined', () => {
    const local = new Set<string>();
    const used = new Set<string>();
    for (const path of sources) {
      const text = readFileSync(path, 'utf8');
      for (const [, name] of text.matchAll(/var\((--[\w-]+)/g))
        if (name && !name.endsWith('-')) used.add(name);
      // Names built in a template, such as var(--text-${size}), end with a dash and are skipped.
      for (const [, name] of text.matchAll(/(--[\w-]+)\s*:/g)) if (name) local.add(name);
    }
    const undefinedTokens = [...used].filter((name) => !tokens.has(name) && !local.has(name));
    expect(undefinedTokens).toEqual([]);
  });

  it('defines every colour as a six-digit value, once', () => {
    const colours = [...tokensCss.matchAll(/(--color-[\w-]+)\s*:\s*(#[0-9a-f]{6});/gi)];
    expect(colours.length).toBeGreaterThanOrEqual(9);
    expect(new Set(colours.map((match) => match[1])).size).toBe(colours.length);
  });
});

describe('fonts', () => {
  const fontsDir = join(root, 'public', 'fonts');
  const families = ['cormorant-garamond', 'inter', 'ibm-plex-mono'];

  it('ships every font file the tokens point to', () => {
    const urls = [...tokensCss.matchAll(/url\('(\/fonts\/[^']+)'\)/g)].map((match) => match[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(existsSync(join(root, 'public', url ?? ''))).toBe(true);
  });

  it.each(families)('keeps the licence of %s next to its files', (family) => {
    const licence = readFileSync(join(fontsDir, family, 'LICENSE'), 'utf8');
    expect(licence).toMatch(/SIL OPEN FONT LICENSE/i);
  });

  it('makes no request to a font service', () => {
    const files = [...walk(join(root, 'src')), ...walk(join(root, 'public'))].filter(
      (path) => /\.(css|astro|ts|js|svg|html)$/.test(path) && !/\.test\.ts$/.test(path),
    );
    const offenders = files
      .filter((path) =>
        /fonts\.googleapis|fonts\.gstatic|use\.typekit|fonts\.bunny|cdnjs.*font/i.test(
          readFileSync(path, 'utf8'),
        ),
      )
      .map((path) => relative(root, path));
    expect(offenders).toEqual([]);
  });
});
