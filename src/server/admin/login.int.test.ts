import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test-support/database.ts';
import type { TestDatabase } from '../../test-support/database.ts';
import { createAccount, disableAccount } from './accounts.ts';
import { listActivity } from './activity.ts';
import { attemptLogin } from './login.ts';
import { resolveSession } from './sessions.ts';
import { testSettings } from './test-settings.ts';

let testDb: TestDatabase;
const password = 'a-very-unusual-passphrase';

beforeEach(async () => {
  testDb = await createTestDatabase();
  await testDb.migrate();
  for (const email of ['alice@example.test', 'bob@example.test']) {
    const result = await createAccount(testDb.db, {
      displayName: email.split('@')[0] ?? '',
      email,
      actor: { name: 'setup', ip: '::1' },
      temporaryPassword: password,
    });
    if (!result.ok) throw new Error(result.error);
  }
});

afterEach(async () => {
  await testDb.dispose();
});

const login = (email: string, pass: string, ip = '198.51.100.1', now?: Date) =>
  attemptLogin(testDb.db, testSettings, { email, password: pass, ip, userAgent: 'Test/1.0' }, now);

describe('attemptLogin', () => {
  it('opens a session with a new token each time, records the login date and the factor', async () => {
    const first = await login('Alice@Example.Test', password);
    const second = await login('alice@example.test', password);
    if (!first.ok || !second.ok) throw new Error('login failed');
    expect(first.token).not.toBe(second.token);
    expect(first.mustChangePassword).toBe(true);

    const active = await resolveSession(testDb.db, first.token, testSettings);
    expect(active?.session.factors).toEqual(['password']);
    expect(active?.account.lastLoginAt).toBeInstanceOf(Date);
    const log = await listActivity(testDb.db, 1);
    expect(log.entries[0]).toMatchObject({ action: 'login', actor: 'alice', ip: '198.51.100.1' });
  });

  it('gives the same answer for a wrong password, an unknown email and a disabled account', async () => {
    const bob = await login('bob@example.test', password);
    if (!bob.ok) throw new Error('login failed');
    const carol = await createAccount(testDb.db, {
      displayName: 'carol',
      email: 'carol@example.test',
      actor: { name: 'setup', ip: '::1' },
      temporaryPassword: password,
    });
    if (!carol.ok) throw new Error(carol.error);
    await disableAccount(testDb.db, carol.account.id, { name: 'setup', ip: '::1' });

    const answers = await Promise.all([
      login('alice@example.test', 'not-the-password-123'),
      login('nobody@example.test', password),
      login('carol@example.test', password),
    ]);
    for (const answer of answers) expect(answer).toEqual({ ok: false, reason: 'invalid' });
  });

  it('checks a password whether or not the account exists, in the same time', async () => {
    const median = async (email: string) => {
      const times: number[] = [];
      for (let attempt = 0; attempt < 5; attempt++) {
        // A different IP each time keeps the limits out of the measure.
        const start = performance.now();
        await login(email, 'not-the-password-123', `192.0.2.${String(attempt + 1)}`);
        times.push(performance.now() - start);
      }
      return times.sort((x, y) => x - y)[2] ?? 0;
    };
    await median('alice@example.test'); // warms the engine
    const known = await median('bob@example.test');
    const unknown = await median('nobody@example.test');
    expect(unknown / known).toBeGreaterThan(0.5);
    expect(unknown / known).toBeLessThan(2);
  });

  it('records failed logins in the activity log with the email typed and the IP', async () => {
    await login('nobody@example.test', password, '203.0.113.7');
    const entry = (await listActivity(testDb.db, 1)).entries[0];
    expect(entry).toMatchObject({
      action: 'login_failed',
      actor: 'nobody@example.test',
      ip: '203.0.113.7',
    });
  });
});

describe('login limits', () => {
  const start = new Date('2026-01-01T10:00:00Z');
  const minutes = (count: number) => new Date(start.getTime() + count * 60_000);

  it('limits failures per account, even when the right password comes next, and says when to retry', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await login(
        'alice@example.test',
        'wrong-password-12',
        `192.0.2.${String(attempt + 1)}`,
        minutes(attempt),
      );
    }
    const blocked = await login('alice@example.test', password, '192.0.2.99', minutes(5));
    // The first failure was at minute 0 and the window lasts 15 minutes: retry at minute 15.
    expect(blocked).toEqual({ ok: false, reason: 'limited', retryAfterSeconds: 10 * 60 });
    // Other accounts are not affected.
    expect((await login('bob@example.test', password, '192.0.2.99', minutes(5))).ok).toBe(true);
    // Once the oldest failure leaves the window, the account can try again.
    expect((await login('alice@example.test', password, '192.0.2.99', minutes(16))).ok).toBe(true);
  });

  it('limits an unknown email the same way, so the limit does not reveal accounts', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await login('ghost@example.test', password, `192.0.2.${String(attempt + 1)}`, minutes(0));
    }
    expect(await login('ghost@example.test', password, '192.0.2.99', minutes(1))).toMatchObject({
      reason: 'limited',
    });
  });

  it('limits failures per IP address across accounts', async () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      await login(
        `user${String(attempt)}@example.test`,
        'wrong-password-12',
        '192.0.2.50',
        minutes(0),
      );
    }
    const blocked = await login('alice@example.test', password, '192.0.2.50', minutes(1));
    expect(blocked).toMatchObject({ ok: false, reason: 'limited' });
    expect((await login('alice@example.test', password, '192.0.2.51', minutes(1))).ok).toBe(true);
  });

  it('forgets the account failures after a successful login', async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      await login(
        'alice@example.test',
        'wrong-password-12',
        `192.0.2.${String(attempt + 1)}`,
        minutes(0),
      );
    }
    expect((await login('alice@example.test', password, '192.0.2.99', minutes(1))).ok).toBe(true);
    await login('alice@example.test', 'wrong-password-12', '192.0.2.98', minutes(2));
    expect((await login('alice@example.test', password, '192.0.2.97', minutes(3))).ok).toBe(true);
  });
});
