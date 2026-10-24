import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { activityActions } from '../server/admin/activity.ts';
import { actionText, errorText, limitedText, messages, pageText } from './messages.ts';

const srcDir = join(import.meta.dirname, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('admin messages', () => {
  it('have no empty text', () => {
    for (const [key, text] of Object.entries(messages)) expect(text.trim(), key).not.toBe('');
  });

  it('are all used by the code', () => {
    const sources = walk(srcDir)
      .filter((path) => /\.(astro|ts)$/.test(path) && !/\.test\.ts$/.test(path))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    // Error and action texts are looked up by code, the others by key.
    const unused = Object.keys(messages).filter(
      (key) => !/^(error|action)\./.test(key) && !sources.includes(`'${key}'`),
    );
    expect(unused).toEqual([]);
  });

  it('has a text for every activity action and the error codes', () => {
    for (const action of activityActions) expect(actionText(action)).not.toBe(action);
    expect(errorText('last_active')).toMatch(/dernier compte actif/);
    expect(errorText('unknown-code')).toBe(messages['error.not_found']);
  });

  it('says when to try again', () => {
    expect(limitedText(30)).toBe('Trop de tentatives de connexion. Réessayez dans 30 secondes.');
    expect(limitedText(1)).toBe('Trop de tentatives de connexion. Réessayez dans 1 seconde.');
    expect(limitedText(61)).toBe('Trop de tentatives de connexion. Réessayez dans 2 minutes.');
    expect(limitedText(60)).toBe('Trop de tentatives de connexion. Réessayez dans 1 minute.');
    expect(pageText(2, 5)).toBe('Page 2 sur 5');
  });
});
