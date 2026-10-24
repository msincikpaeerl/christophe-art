import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test-support/database.ts';
import type { TestDatabase } from '../../test-support/database.ts';
import { adminSessions } from '../schema.ts';
import { createAccount, disableAccount } from './accounts.ts';
import {
  createSession,
  endSessionByToken,
  hashToken,
  listSessions,
  resolveSession,
  revokeSession,
  revokeSessions,
} from './sessions.ts';
import { sessionCookieOptions } from './settings.ts';
import { testSettings } from './test-settings.ts';

let testDb: TestDatabase;
let aliceId = '';
let bobId = '';

beforeEach(async () => {
  testDb = await createTestDatabase();
  await testDb.migrate();
  const ids: string[] = [];
  for (const email of ['alice@example.test', 'bob@example.test']) {
    const result = await createAccount(testDb.db, {
      displayName: email.split('@')[0] ?? '',
      email,
      actor: { name: 'setup', ip: '::1' },
      temporaryPassword: 'a-very-unusual-passphrase',
    });
    if (!result.ok) throw new Error(result.error);
    ids.push(result.account.id);
  }
  [aliceId, bobId] = ids as [string, string];
});

afterEach(async () => {
  await testDb.dispose();
});

const open = (accountId: string, now?: Date) =>
  createSession(
    testDb.db,
    { accountId, factors: ['password'], userAgent: 'Test/1.0', ip: '::1' },
    now,
  );

describe('session token', () => {
  it('is random, at least 256 bits, different each time, and stored hashed', async () => {
    const first = await open(aliceId);
    const second = await open(aliceId);
    // 32 random bytes in base64url are 43 characters.
    expect(first.token).toMatch(/^[\w-]{43,}$/);
    expect(first.token).not.toBe(second.token);
    const rows = await testDb.db.select().from(adminSessions);
    expect(rows.map((row) => row.tokenHash)).toContain(hashToken(first.token));
    expect(JSON.stringify(rows)).not.toContain(first.token);
  });
});

describe('session cookie', () => {
  it('is HttpOnly, Secure, SameSite=Strict, limited to /admin and as long as the maximum lifetime', () => {
    expect(sessionCookieOptions(testSettings)).toEqual({
      path: '/admin',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 12 * 3600,
    });
  });
});

describe('resolveSession', () => {
  const start = new Date('2026-01-01T10:00:00Z');
  const later = (minutes: number) => new Date(start.getTime() + minutes * 60_000);

  it('finds a live session and refuses unknown or missing tokens', async () => {
    const { token } = await open(aliceId, start);
    expect((await resolveSession(testDb.db, token, testSettings, later(5)))?.account.id).toBe(
      aliceId,
    );
    expect(await resolveSession(testDb.db, 'unknown', testSettings, later(5))).toBeUndefined();
    expect(await resolveSession(testDb.db, undefined, testSettings, later(5))).toBeUndefined();
  });

  it('ends a session idle for longer than the idle timeout, and keeps an active one alive', async () => {
    const { token } = await open(aliceId, start);
    expect(await resolveSession(testDb.db, token, testSettings, later(50))).toBeDefined();
    // 50 minutes later the activity was refreshed: 60 more minutes from there is still fine.
    expect(await resolveSession(testDb.db, token, testSettings, later(100))).toBeDefined();
    expect(await resolveSession(testDb.db, token, testSettings, later(100 + 61))).toBeUndefined();
    expect(await listSessions(testDb.db, aliceId)).toHaveLength(0);
  });

  it('ends a session older than the maximum lifetime, however active', async () => {
    const { token } = await open(aliceId, start);
    for (let minutes = 30; minutes <= 12 * 60; minutes += 30) {
      expect(await resolveSession(testDb.db, token, testSettings, later(minutes))).toBeDefined();
    }
    expect(
      await resolveSession(testDb.db, token, testSettings, later(12 * 60 + 30)),
    ).toBeUndefined();
  });

  it('refuses the session of a disabled account', async () => {
    const { token } = await open(bobId, start);
    await disableAccount(testDb.db, bobId, { name: 'setup', ip: '::1' });
    expect(await resolveSession(testDb.db, token, testSettings, start)).toBeUndefined();
  });
});

describe('revoking sessions', () => {
  it('revokes one session of the account, but not another account’s', async () => {
    const mine = await open(aliceId);
    const theirs = await open(bobId);
    expect(await revokeSession(testDb.db, aliceId, theirs.id)).toBe(false);
    expect(await revokeSession(testDb.db, aliceId, mine.id)).toBe(true);
    expect(await listSessions(testDb.db, aliceId)).toHaveLength(0);
    expect(await listSessions(testDb.db, bobId)).toHaveLength(1);
  });

  it('revokes all sessions except one', async () => {
    const kept = await open(aliceId);
    await open(aliceId);
    await open(aliceId);
    expect(await revokeSessions(testDb.db, aliceId, kept.id)).toBe(2);
    expect((await listSessions(testDb.db, aliceId)).map((row) => row.id)).toEqual([kept.id]);
  });

  it('ends the session that owns a token', async () => {
    const { token } = await open(aliceId);
    await endSessionByToken(testDb.db, token);
    expect(await resolveSession(testDb.db, token, testSettings)).toBeUndefined();
  });
});
