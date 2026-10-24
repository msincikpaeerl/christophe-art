import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const pagesDir = join(import.meta.dirname, '..', 'pages');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/**
 * Every admin address, found by listing the files of src/pages/admin, so that a new admin page is
 * covered by the tests without anyone remembering to add it. Dynamic parts such as `[id]` are
 * filled with an example value.
 */
export function adminRoutes(): string[] {
  return walk(join(pagesDir, 'admin'))
    .filter((path) => /\.(astro|ts)$/.test(path))
    .map((path) => {
      const parts = relative(pagesDir, path)
        .replace(/\.(astro|ts)$/, '')
        .split(sep)
        .map((part) => part.replace(/^\[\.{0,3}(\w+)\]$/, 'example-$1'));
      if (parts.at(-1) === 'index') parts.pop();
      return `/${parts.join('/')}`;
    })
    .sort();
}

/** The one admin address a visitor may open. */
export const publicAdminRoutes = ['/admin/connexion'];
