import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config.ts';

const valid = {
  DATABASE_URL: 'postgres://user:pw@localhost:5432/db',
  ADMIN_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString('base64'),
};

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
    expect(() =>
      loadConfig({ ...valid, DATABASE_URL: 'pglite://memory', NODE_ENV: 'production' }),
    ).toThrow(/DATABASE_URL.*production/);
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
        'ADMIN_ENCRYPTION_KEY',
      ]);
    }
  });

  describe('second-factor settings', () => {
    it('refuses to start without the encryption key', () => {
      const attempt = () => loadConfig({ DATABASE_URL: valid.DATABASE_URL });
      expect(attempt).toThrow(ConfigError);
      expect(attempt).toThrow(/ADMIN_ENCRYPTION_KEY: is required but missing/);
    });

    it('refuses a key that is not 32 bytes of base64, without echoing it', () => {
      for (const bad of ['short', Buffer.alloc(16).toString('base64'), 'x'.repeat(44)]) {
        const attempt = () => loadConfig({ ...valid, ADMIN_ENCRYPTION_KEY: bad });
        expect(attempt).toThrow(/ADMIN_ENCRYPTION_KEY/);
        expect(attempt).not.toThrow(new RegExp(bad));
      }
    });

    it('has defaults for the lock settings', () => {
      expect(loadConfig(valid)).toMatchObject({
        ADMIN_CODE_MAX_FAILURES: 5,
        ADMIN_CODE_LOCK_MINUTES: 15,
        ADMIN_CODE_STEP_MINUTES: 5,
      });
    });

    it('lists the key in .env.example', () => {
      const example = readFileSync(join(import.meta.dirname, '..', '..', '.env.example'), 'utf8');
      expect(example).toMatch(/^ADMIN_ENCRYPTION_KEY=/m);
    });
  });
});
