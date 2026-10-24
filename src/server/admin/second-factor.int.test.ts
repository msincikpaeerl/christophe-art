import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test-support/database.ts';
import type { TestDatabase } from '../../test-support/database.ts';
import { adminAccounts, adminRecoveryCodes } from '../schema.ts';
import { createAccount, findAccountById } from './accounts.ts';
import { listActivity } from './activity.ts';
import { attemptLogin } from './login.ts';
import {
  beginReplacement,
  confirmSetup,
  generateRecoveryCode,
  normalizeRecoveryCode,
  readPendingSetup,
  recoveryCodeCount,
  regenerateRecoveryCodes,
  remainingRecoveryCodes,
  resetSecondFactor,
  startSetup,
  verifyCode,
} from './second-factor.ts';
import { createSession, resolveSession } from './sessions.ts';
import type { Account } from './sessions.ts';
import { testSettings } from './test-settings.ts';
import { stepAt, totpCode } from './totp.ts';

let testDb: TestDatabase;
const ip = '198.51.100.7';
// A fixed clock: every check below says what time it is.
const now = new Date('2026-03-01T10:00:10Z');
const step = stepAt(now);

async function actions(): Promise<string[]> {
  return (await listActivity(testDb.db, 1)).entries.map((entry) => entry.action);
}

async function fresh(id: string): Promise<Account> {
  const account = await findAccountById(testDb.db, id);
  if (!account) throw new Error('missing account');
  return account;
}

async function newAccount(email: string): Promise<Account> {
  const result = await createAccount(testDb.db, {
    displayName: email.split('@')[0] ?? '',
    email,
    actor: { name: 'setup', ip: '::1' },
    temporaryPassword: 'a-very-unusual-passphrase',
  });
  if (!result.ok) throw new Error(result.error);
  return result.account;
}

/** Sets an account up like an admin would: start, read the secret, type its code. */
async function setUp(email: string, at = now) {
  let account = await newAccount(email);
  account = await startSetup(testDb.db, testSettings, account);
  const secret = readPendingSetup(account, testSettings)?.secret ?? '';
  const result = await confirmSetup(
    testDb.db,
    testSettings,
    account,
    totpCode(secret, stepAt(at)),
    ip,
    at,
  );
  if (!result.ok) throw new Error(result.reason);
  return { account: await fresh(account.id), secret, recoveryCodes: result.recoveryCodes ?? [] };
}

beforeEach(async () => {
  testDb = await createTestDatabase();
  await testDb.migrate();
});

afterEach(async () => {
  await testDb.dispose();
});

describe('setup', () => {
  it('keeps the secret encrypted and only saves it once a valid code is typed', async () => {
    let account = await newAccount('ada@example.test');
    account = await startSetup(testDb.db, testSettings, account);
    const pending = readPendingSetup(account, testSettings);
    expect(pending?.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(pending?.svg).toContain('<svg');
    expect(pending?.secretText).toContain(' ');
    // Stored encrypted, and not active yet.
    expect(account.totpPendingSecret).not.toContain(pending?.secret ?? 'x');
    expect(account.totpSecret).toBeNull();

    const wrong = await confirmSetup(testDb.db, testSettings, account, '000000', ip, now);
    expect(wrong).toEqual({ ok: false, reason: 'invalid' });
    expect((await fresh(account.id)).totpSecret).toBeNull();

    const right = await confirmSetup(
      testDb.db,
      testSettings,
      account,
      totpCode(pending?.secret ?? '', step),
      ip,
      now,
    );
    expect(right.ok).toBe(true);
    const saved = await fresh(account.id);
    expect(saved.totpSecret).not.toBeNull();
    expect(saved.totpSecret).not.toContain(pending?.secret ?? 'x');
    expect(saved.totpPendingSecret).toBeNull();
    expect(await actions()).toEqual(expect.arrayContaining(['totp_failed', 'totp_enabled']));
  });

  it('shows 10 recovery codes once and stores only hashes', async () => {
    const { account, recoveryCodes } = await setUp('ada@example.test');
    expect(recoveryCodes).toHaveLength(recoveryCodeCount);
    expect(new Set(recoveryCodes).size).toBe(recoveryCodeCount);
    const rows = await testDb.db.select().from(adminRecoveryCodes);
    expect(rows).toHaveLength(recoveryCodeCount);
    for (const row of rows) {
      expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/);
      for (const code of recoveryCodes) {
        expect(row.codeHash).not.toContain(normalizeRecoveryCode(code) ?? 'x');
      }
    }
    expect(await remainingRecoveryCodes(testDb.db, account.id)).toBe(10);
  });

  it('does not save a secret that was never started', async () => {
    const account = await newAccount('ada@example.test');
    expect(await confirmSetup(testDb.db, testSettings, account, '123456', ip, now)).toEqual({
      ok: false,
      reason: 'no_setup',
    });
  });
});

describe('verifyCode', () => {
  it('accepts a current code once, and refuses the same code again', async () => {
    const { account, secret } = await setUp('ada@example.test', new Date(now.getTime() - 120_000));
    const code = totpCode(secret, step);
    expect(await verifyCode(testDb.db, testSettings, account, code, ip, now)).toEqual({
      ok: true,
      method: 'totp',
    });
    // The account as the next request loads it: the step is recorded.
    const again = await verifyCode(testDb.db, testSettings, await fresh(account.id), code, ip, now);
    expect(again).toEqual({ ok: false, reason: 'invalid' });
  });

  it('refuses two requests that carry the same code at the same time', async () => {
    const { account, secret } = await setUp('ada@example.test', new Date(now.getTime() - 120_000));
    const code = totpCode(secret, step);
    // Both read the account before either wrote: only one may pass.
    const results = await Promise.all([
      verifyCode(testDb.db, testSettings, account, code, ip, now),
      verifyCode(testDb.db, testSettings, account, code, ip, now),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
  });

  it('accepts one step of drift either way and refuses an expired code', async () => {
    const { account, secret } = await setUp('ada@example.test', new Date(now.getTime() - 300_000));
    expect(
      (await verifyCode(testDb.db, testSettings, account, totpCode(secret, step - 1), ip, now)).ok,
    ).toBe(true);
    const next = await fresh(account.id);
    expect(
      (await verifyCode(testDb.db, testSettings, next, totpCode(secret, step + 1), ip, now)).ok,
    ).toBe(true);
    const later = await fresh(account.id);
    expect(
      (await verifyCode(testDb.db, testSettings, later, totpCode(secret, step + 4), ip, now)).ok,
    ).toBe(false);
  });

  it('counts wrong codes per account, locks it, logs the lock, and then refuses even good codes', async () => {
    const { account, secret } = await setUp('ada@example.test', new Date(now.getTime() - 300_000));
    for (let attempt = 1; attempt < testSettings.codeMaxFailures; attempt++) {
      const result = await verifyCode(
        testDb.db,
        testSettings,
        await fresh(account.id),
        '000000',
        ip,
        now,
      );
      expect(result).toEqual({ ok: false, reason: 'invalid' });
    }
    const locking = await verifyCode(
      testDb.db,
      testSettings,
      await fresh(account.id),
      '000000',
      ip,
      now,
    );
    expect(locking).toEqual({
      ok: false,
      reason: 'locked',
      retryAfterSeconds: testSettings.codeLockMinutes * 60,
    });
    const log = await actions();
    expect(log.filter((action) => action === 'totp_failed')).toHaveLength(
      testSettings.codeMaxFailures - 1,
    );
    expect(log).toContain('totp_locked');

    // Locked: a good code is refused too, and nothing more is counted.
    const good = totpCode(secret, step);
    const refused = await verifyCode(
      testDb.db,
      testSettings,
      await fresh(account.id),
      good,
      ip,
      now,
    );
    expect(refused).toMatchObject({ ok: false, reason: 'locked' });

    // After the delay the account works again, with a fresh count.
    const after = new Date(now.getTime() + testSettings.codeLockMinutes * 60_000 + 60_000);
    const recovered = await verifyCode(
      testDb.db,
      testSettings,
      await fresh(account.id),
      totpCode(secret, stepAt(after)),
      ip,
      after,
    );
    expect(recovered.ok).toBe(true);
    expect((await fresh(account.id)).totpFailures).toBe(0);
  });

  it('does not count the failures of one account against another', async () => {
    const ada = await setUp('ada@example.test');
    const bob = await setUp('bob@example.test');
    for (let attempt = 0; attempt < testSettings.codeMaxFailures; attempt++) {
      await verifyCode(testDb.db, testSettings, await fresh(ada.account.id), '000000', ip, now);
    }
    const result = await verifyCode(
      testDb.db,
      testSettings,
      await fresh(bob.account.id),
      '000000',
      ip,
      now,
    );
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('recovery codes', () => {
  it('format: 12 symbols without look-alikes, accepted in any case with or without dashes', () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(normalizeRecoveryCode(code.toLowerCase().replaceAll('-', ' '))).toBe(
      code.replaceAll('-', ''),
    );
    expect(normalizeRecoveryCode('short')).toBeUndefined();
    expect(normalizeRecoveryCode('0000-0000-0000')).toBeUndefined();
  });

  it('each works once in place of a code, is logged, and the count goes down', async () => {
    const { account, recoveryCodes } = await setUp('ada@example.test');
    const first = recoveryCodes[0] ?? '';
    expect(
      await verifyCode(testDb.db, testSettings, account, first.toLowerCase(), ip, now),
    ).toEqual({ ok: true, method: 'recovery' });
    expect(await remainingRecoveryCodes(testDb.db, account.id)).toBe(9);
    expect(await verifyCode(testDb.db, testSettings, account, first, ip, now)).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(await actions()).toContain('recovery_used');
  });

  it('a wrong recovery code counts as a wrong code', async () => {
    const { account } = await setUp('ada@example.test');
    await verifyCode(testDb.db, testSettings, account, 'AAAA-BBBB-CCCC', ip, now);
    expect((await fresh(account.id)).totpFailures).toBe(1);
  });

  it('a new set replaces the old one at once', async () => {
    const { account, recoveryCodes } = await setUp('ada@example.test');
    const fresh1 = await regenerateRecoveryCodes(testDb.db, testSettings, account, ip);
    expect(fresh1).toHaveLength(recoveryCodeCount);
    expect(await remainingRecoveryCodes(testDb.db, account.id)).toBe(10);
    const old = await verifyCode(testDb.db, testSettings, account, recoveryCodes[0] ?? '', ip, now);
    expect(old).toEqual({ ok: false, reason: 'invalid' });
    const created = await verifyCode(testDb.db, testSettings, account, fresh1[0] ?? '', ip, now);
    expect(created).toEqual({ ok: true, method: 'recovery' });
    expect(await actions()).toContain('recovery_regenerated');
  });
});

describe('replacing the authenticator app', () => {
  it('needs a current code, then goes through setup again and keeps the recovery codes', async () => {
    const early = new Date(now.getTime() - 300_000);
    const { account, secret } = await setUp('ada@example.test', early);

    const refused = await beginReplacement(testDb.db, testSettings, account, '000000', ip, now);
    expect(refused.ok).toBe(false);
    expect((await fresh(account.id)).totpPendingSecret).toBeNull();

    const started = await beginReplacement(
      testDb.db,
      testSettings,
      await fresh(account.id),
      totpCode(secret, step),
      ip,
      now,
    );
    expect(started.ok).toBe(true);
    const withPending = await fresh(account.id);
    const next = readPendingSetup(withPending, testSettings)?.secret ?? '';
    expect(next).not.toBe(secret);

    // The old app still works until the new one is confirmed.
    expect(withPending.totpSecret).toBe(account.totpSecret);

    const later = new Date(now.getTime() + 60_000);
    const done = await confirmSetup(
      testDb.db,
      testSettings,
      withPending,
      totpCode(next, stepAt(later)),
      ip,
      later,
    );
    expect(done).toMatchObject({ ok: true, replaced: true, recoveryCodes: undefined });
    expect(await remainingRecoveryCodes(testDb.db, account.id)).toBe(10);
    expect(await actions()).toContain('totp_replaced');
    // The old secret no longer works.
    const stale = await verifyCode(
      testDb.db,
      testSettings,
      await fresh(account.id),
      totpCode(secret, stepAt(later) + 1),
      ip,
      later,
    );
    expect(stale.ok).toBe(false);
  });
});

describe('reset by another admin', () => {
  it('removes the factor and the recovery codes, ends the sessions and is logged', async () => {
    const target = await setUp('ada@example.test');
    const other = await newAccount('bob@example.test');
    await createSession(testDb.db, {
      accountId: target.account.id,
      factors: ['password', 'totp'],
      userAgent: 'test',
      ip,
    });
    const result = await resetSecondFactor(
      testDb.db,
      target.account.id,
      { name: 'bob', ip },
      other.id,
    );
    expect(result.ok).toBe(true);
    const reset = await fresh(target.account.id);
    expect(reset).toMatchObject({
      totpSecret: null,
      totpPendingSecret: null,
      totpLastStep: null,
      totpFailures: 0,
      totpLockedUntil: null,
    });
    expect(await remainingRecoveryCodes(testDb.db, target.account.id)).toBe(0);
    expect(await actions()).toContain('totp_reset');
    const log = (await listActivity(testDb.db, 1)).entries[0];
    expect(log).toMatchObject({ action: 'totp_reset', actor: 'bob', target: 'ada' });

    // The next login leads to the setup screen.
    const login = await attemptLogin(testDb.db, testSettings, {
      email: 'ada@example.test',
      password: 'a-very-unusual-passphrase',
      ip,
      userAgent: 'test',
    });
    expect(login).toMatchObject({ ok: true, next: '/admin/double-authentification' });
  });

  it('also unlocks a locked account', async () => {
    const target = await setUp('ada@example.test');
    const other = await newAccount('bob@example.test');
    await testDb.db
      .update(adminAccounts)
      .set({ totpLockedUntil: new Date(now.getTime() + 3_600_000) })
      .where(eq(adminAccounts.id, target.account.id));
    await resetSecondFactor(testDb.db, target.account.id, { name: 'bob', ip }, other.id);
    expect((await fresh(target.account.id)).totpLockedUntil).toBeNull();
  });

  it('refuses to remove your own second factor (the last one)', async () => {
    const own = await setUp('ada@example.test');
    const result = await resetSecondFactor(
      testDb.db,
      own.account.id,
      { name: 'ada', ip },
      own.account.id,
    );
    expect(result).toEqual({ ok: false, error: 'own_second_factor' });
    expect((await fresh(own.account.id)).totpSecret).not.toBeNull();
    expect(await remainingRecoveryCodes(testDb.db, own.account.id)).toBe(10);
  });

  it('refuses an unknown account and an account without a second factor', async () => {
    const plain = await newAccount('ada@example.test');
    const other = await newAccount('bob@example.test');
    expect(await resetSecondFactor(testDb.db, plain.id, { name: 'bob', ip }, other.id)).toEqual({
      ok: false,
      error: 'no_second_factor',
    });
    expect(
      await resetSecondFactor(
        testDb.db,
        '00000000-0000-4000-8000-000000000000',
        { name: 'bob', ip },
        other.id,
      ),
    ).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('the code step', () => {
  it('expires after the delay (a setting) and the session is gone', async () => {
    const { account } = await setUp('ada@example.test');
    const { token } = await createSession(
      testDb.db,
      { accountId: account.id, factors: ['password'], userAgent: 'test', ip },
      now,
    );
    const inTime = new Date(now.getTime() + (testSettings.codeStepMinutes - 1) * 60_000);
    expect(await resolveSession(testDb.db, token, testSettings, inTime)).toBeDefined();
    const tooLate = new Date(now.getTime() + (testSettings.codeStepMinutes + 1) * 60_000);
    expect(await resolveSession(testDb.db, token, testSettings, tooLate)).toBeUndefined();
    // Gone for good, even if asked again with an earlier time.
    expect(await resolveSession(testDb.db, token, testSettings, inTime)).toBeUndefined();
  });

  it('does not close a session that passed the code step', async () => {
    const { account } = await setUp('ada@example.test');
    const { token } = await createSession(
      testDb.db,
      { accountId: account.id, factors: ['password', 'totp'], userAgent: 'test', ip },
      now,
    );
    const later = new Date(now.getTime() + 30 * 60_000);
    expect(await resolveSession(testDb.db, token, testSettings, later)).toBeDefined();
  });
});
