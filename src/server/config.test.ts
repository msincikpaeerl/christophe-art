import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config.ts';

const valid = { DATABASE_URL: 'postgres://user:pw@localhost:5432/db' };

describe('loadConfig', () => {
  it('applies the defaults', () => {
    const config = loadConfig(valid);
    expect(config).toMatchObject({
      NODE_ENV: 'development',
      HOST: '0.0.0.0',
      PORT: 4321,
      UPLOADS_DIR: './uploads',
      LOG_LEVEL: 'info',
    });
  });

  it('reads the variables it is given', () => {
    const config = loadConfig({ ...valid, PORT: '8080', LOG_LEVEL: 'debug' });
    expect(config.PORT).toBe(8080);
    expect(config.LOG_LEVEL).toBe('debug');
  });

  it('keeps the development pages off unless asked', () => {
    expect(loadConfig(valid).DEV_PAGES).toBe(false);
    expect(loadConfig({ ...valid, DEV_PAGES: 'true' }).DEV_PAGES).toBe(true);
  });

  it('accepts an optional public address of the site, without trailing slash', () => {
    expect(loadConfig(valid).SITE_URL).toBeUndefined();
    expect(loadConfig({ ...valid, SITE_URL: 'https://christophe.art/' }).SITE_URL).toBe(
      'https://christophe.art',
    );
    expect(() => loadConfig({ ...valid, SITE_URL: 'christophe.art' })).toThrow(/SITE_URL/);
    expect(() => loadConfig({ ...valid, SITE_URL: 'https://christophe.art/fr' })).toThrow(
      /SITE_URL/,
    );
  });

  it('names a missing variable', () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    expect(() => loadConfig({})).toThrow(/DATABASE_URL: is required but missing/);
  });

  it('names an invalid variable without echoing its value', () => {
    const attempt = () => loadConfig({ ...valid, PORT: 'not-a-port' });
    expect(attempt).toThrow(/PORT/);
    expect(attempt).not.toThrow(/not-a-port/);
  });

  it('rejects a database URL of another kind', () => {
    expect(() => loadConfig({ DATABASE_URL: 'mysql://secret@host/db' })).toThrow(/DATABASE_URL/);
  });

  it('refuses the in-memory database in production', () => {
    expect(() => loadConfig({ DATABASE_URL: 'pglite://memory', NODE_ENV: 'production' })).toThrow(
      /DATABASE_URL.*production/,
    );
  });

  it('lists every faulty variable at once', () => {
    try {
      loadConfig({ PORT: '0', LOG_LEVEL: 'loud' });
      expect.unreachable();
    } catch (error) {
      expect((error as ConfigError).issues.map((issue) => issue.split(':')[0])).toEqual([
        'PORT',
        'DATABASE_URL',
        'LOG_LEVEL',
      ]);
    }
  });
});
