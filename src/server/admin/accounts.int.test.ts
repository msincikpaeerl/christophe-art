import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test-support/database.ts';
import type { TestDatabase } from '../../test-support/database.ts';
import { adminAccounts, adminSessions } from '../schema.ts';
import {
  changeOwnPassword,
  createAccount,
  disableAccount,
  enableAccount,
  findAccountByEmail,
  listAccounts,
  resetPassword,
} from './accounts.ts';
import { listActivity } from './activity.ts';
import { attemptLogin } from './login.ts';
import { verifyPassword } from './password.ts';
import { createSession, listSessions } from './sessions.ts';
import { testSettings } from './test-settings.ts';

let testDb: TestDatabase;
const actor = { name: 'Alice', ip: '203.0.113.9' };

beforeEach(async () => {
  testDb = await createTestDatabase();
  await testDb.migrate();
});

afterEach(async () => {
  await testDb.dispose();
});

async function newAccount(email: string, password = 'a-very-unusual-passphrase') {
  const result = await createAccount(testDb.db, {
    displayName: email.split('@')[0] ?? '',
    email,
    actor,
    temporaryPassword: password,
  });
  if (!result.ok) throw new Error(result.error);
  return result.account;
}

function session(accountId: string) {
  return createSession(testDb.db, {
    accountId,
    factors: ['password'],
    userAgent: 'test',
    ip: '::1',
  });
}

describe('createAccount', () => {
  it('stores the display name, login email, status and dates, and hashes the password', async () => {
    const result = await createAccount(testDb.db, {
      displayName: '  Bob Martin ',
      email: ' Bob@Example.Test ',
      actor,
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.account).toMatchObject({
      displayName: 'Bob Martin',
      email: 'bob@example.test',
      status: 'active',
      lastLoginAt: null,
      mustChangePassword: true,
    });
    expect(result.account.createdAt).toBeInstanceOf(Date);
    expect(result.account.passwordHash).toMatch(/^\$argon2id\$/);
    expect(result.account.passwordHash).not.toContain(result.temporaryPassword);
    expect(result.temporaryPassword).toHaveLength(16);
    expect(await verifyPassword(result.temporaryPassword, result.account.passwordHash)).toBe(true);
  });

  it('refuses a duplicate email (whatever its case), a bad email and a bad name', async () => {
    await newAccount('bob@example.test');
    const create = (displayName: string, email: string) =>
      createAccount(testDb.db, { displayName, email, actor });
    expect(await create('Other', 'BOB@example.test')).toEqual({ ok: false, error: 'email_taken' });
    expect(await create('Other', 'not-an-email')).toEqual({ ok: false, error: 'invalid_email' });
    expect(await create('   ', 'x@example.test')).toEqual({ ok: false, error: 'invalid_name' });
    expect(await create('x'.repeat(81), 'x@example.test')).toEqual({
      ok: false,
      error: 'invalid_name',
    });
    expect(await listAccounts(testDb.db)).toHaveLength(1);
  });

  it('refuses a weak temporary password', async () => {
    const result = await createAccount(testDb.db, {
      displayName: 'Bob',
      email: 'bob@example.test',
      actor,
      temporaryPassword: 'short',
    });
    expect(result).toEqual({ ok: false, error: 'too_short' });
  });

  it('writes the creation to the activity log', async () => {
    await newAccount('bob@example.test');
    const log = await listActivity(testDb.db, 1);
    expect(log.entries[0]).toMatchObject({
      action: 'account_created',
      actor: 'Alice',
      target: 'bob',
      ip: '203.0.113.9',
    });
    expect(log.entries[0]?.at).toBeInstanceOf(Date);
  });
});

describe('disableAccount and enableAccount', () => {
  it('disables an account, ends its sessions at once and blocks its login', async () => {
    const alice = await newAccount('alice@example.test');
    const bob = await newAccount('bob@example.test');
    await session(bob.id);
    await session(bob.id);

    expect(
      await disableAccount(testDb.db, bob.id, { name: alice.displayName, ip: '::1' }),
    ).toMatchObject({
      ok: true,
    });

    expect(await listSessions(testDb.db, bob.id)).toHaveLength(0);
    const login = await attemptLogin(testDb.db, testSettings, {
      email: 'bob@example.test',
      password: 'a-very-unusual-passphrase',
      ip: '::1',
      userAgent: 'test',
    });
    expect(login).toEqual({ ok: false, reason: 'invalid' });
  });

  it('refuses to disable the last active account', async () => {
    const alice = await newAccount('alice@example.test');
    expect(await disableAccount(testDb.db, alice.id, actor)).toEqual({
      ok: false,
      error: 'last_active',
    });
    const bob = await newAccount('bob@example.test');
    expect((await disableAccount(testDb.db, bob.id, actor)).ok).toBe(true);
    // Only Alice is active now.
    expect(await disableAccount(testDb.db, alice.id, actor)).toEqual({
      ok: false,
      error: 'last_active',
    });
  });

  it('re-enables an account, which can log in again', async () => {
    await newAccount('alice@example.test');
    const bob = await newAccount('bob@example.test');
    await disableAccount(testDb.db, bob.id, actor);
    expect((await enableAccount(testDb.db, bob.id, actor)).ok).toBe(true);
    const login = await attemptLogin(testDb.db, testSettings, {
      email: 'bob@example.test',
      password: 'a-very-unusual-passphrase',
      ip: '::1',
      userAgent: 'test',
    });
    expect(login.ok).toBe(true);
  });

  it('logs both actions and answers not_found for an unknown account', async () => {
    await newAccount('alice@example.test');
    const bob = await newAccount('bob@example.test');
    await disableAccount(testDb.db, bob.id, actor);
    await enableAccount(testDb.db, bob.id, actor);
    const actions = (await listActivity(testDb.db, 1)).entries.map((entry) => entry.action);
    expect(actions.slice(0, 2)).toEqual(['account_enabled', 'account_disabled']);
    const unknown = '00000000-0000-4000-8000-000000000000';
    expect(await disableAccount(testDb.db, unknown, actor)).toEqual({
      ok: false,
      error: 'not_found',
    });
    expect(await enableAccount(testDb.db, unknown, actor)).toEqual({
      ok: false,
      error: 'not_found',
    });
  });
});

describe('resetPassword', () => {
  it('gives a temporary password, ends the sessions and requires a change', async () => {
    const alice = await newAccount('alice@example.test');
    const bob = await newAccount('bob@example.test');
    await changeOwn(bob.id);
    await session(bob.id);

    const result = await resetPassword(testDb.db, bob.id, actor, alice.id);
    if (!result.ok) throw new Error(result.error);

    expect(await listSessions(testDb.db, bob.id)).toHaveLength(0);
    const stored = await findAccountByEmail(testDb.db, 'bob@example.test');
    expect(stored?.mustChangePassword).toBe(true);
    expect(await verifyPassword(result.temporaryPassword, stored?.passwordHash ?? '')).toBe(true);
    expect(await verifyPassword('a-very-unusual-passphrase', stored?.passwordHash ?? '')).toBe(
      false,
    );
    expect((await listActivity(testDb.db, 1)).entries[0]).toMatchObject({
      action: 'password_reset',
      target: 'bob',
    });
  });

  it('refuses to reset your own password and an unknown account', async () => {
    const alice = await newAccount('alice@example.test');
    expect(await resetPassword(testDb.db, alice.id, actor, alice.id)).toEqual({
      ok: false,
      error: 'own_account',
    });
    expect(await resetPassword(testDb.db, '00000000-0000-4000-8000-000000000000', actor)).toEqual({
      ok: false,
      error: 'not_found',
    });
  });

  async function changeOwn(accountId: string) {
    await testDb.db
      .update(adminAccounts)
      .set({ mustChangePassword: false })
      .where(eq(adminAccounts.id, accountId));
  }
});

describe('changeOwnPassword', () => {
  const change = async (
    email: string,
    current: string,
    next: string,
    keepSessionId = '00000000-0000-4000-8000-000000000000',
  ) => {
    const account = await findAccountByEmail(testDb.db, email);
    if (!account) throw new Error('missing account');
    return changeOwnPassword(testDb.db, {
      account,
      currentPassword: current,
      newPassword: next,
      keepSessionId,
      ip: '::1',
    });
  };

  it('needs the current password', async () => {
    await newAccount('alice@example.test');
    expect(
      await change('alice@example.test', 'wrong-password-123', 'Another-unusual-pass-9'),
    ).toEqual({
      ok: false,
      error: 'wrong_current_password',
    });
  });

  it('applies the password policy and refuses the same password', async () => {
    await newAccount('alice@example.test');
    const current = 'a-very-unusual-passphrase';
    expect(await change('alice@example.test', current, 'short')).toEqual({
      ok: false,
      error: 'too_short',
    });
    expect(await change('alice@example.test', current, 'password1234')).toEqual({
      ok: false,
      error: 'too_common',
    });
    expect(await change('alice@example.test', current, current)).toEqual({
      ok: false,
      error: 'same_password',
    });
  });

  it('changes the password, clears the change requirement and ends the other sessions only', async () => {
    const alice = await newAccount('alice@example.test');
    const kept = await session(alice.id);
    await session(alice.id);
    await session(alice.id);

    const result = await change(
      'alice@example.test',
      'a-very-unusual-passphrase',
      'Another-unusual-pass-9',
      kept.id,
    );

    expect(result.ok).toBe(true);
    const remaining = await testDb.db.select().from(adminSessions);
    expect(remaining.map((row) => row.id)).toEqual([kept.id]);
    const stored = await findAccountByEmail(testDb.db, 'alice@example.test');
    expect(stored?.mustChangePassword).toBe(false);
    expect(await verifyPassword('Another-unusual-pass-9', stored?.passwordHash ?? '')).toBe(true);
    expect((await listActivity(testDb.db, 1)).entries[0]?.action).toBe('password_changed');
  });
});
