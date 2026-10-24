// The second factor: authenticator app codes (TOTP) and recovery codes. Setup, code checks,
// limits per account, recovery code sets and the reset by another admin.
import { randomInt } from 'node:crypto';
import { and, count, eq, isNull, lt, or, sql } from 'drizzle-orm';
import type { Database } from '../database.ts';
import { adminAccounts, adminRecoveryCodes } from '../schema.ts';
import type { Actor, Result } from './accounts.ts';
import { recordActivity } from './activity.ts';
import { decryptText, encryptText, keyedHash } from './secret-box.ts';
import { revokeSessions } from './sessions.ts';
import type { Account } from './sessions.ts';
import type { AdminSettings } from './settings.ts';
import { checkTotp, generateTotpSecret, groupSecret, otpauthUri, qrSvg } from './totp.ts';

export const recoveryCodeCount = 10;
/** The admin is warned when this many recovery codes, or fewer, remain. */
export const recoveryWarningThreshold = 2;
/** Name shown in the authenticator app. */
export const totpIssuer = 'Christophe Art';

/** No look-alike characters (no I, O, 0, 1): 32 symbols, so 5 bits each. */
const recoveryAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const recoveryLength = 12;

/** A recovery code such as `K7QM-2XPD-9TNA` (60 bits). */
export function generateRecoveryCode(): string {
  let code = '';
  for (let index = 0; index < recoveryLength; index++) {
    code += recoveryAlphabet.charAt(randomInt(recoveryAlphabet.length));
  }
  return code.replace(/(.{4})(?=.)/g, '$1-');
}

/** The canonical form of a typed recovery code, or undefined when it cannot be one. */
export function normalizeRecoveryCode(input: string): string | undefined {
  const clean = input.replace(/[\s-]/g, '').toUpperCase();
  return /^[A-HJ-NP-Z2-9]{12}$/.test(clean) ? clean : undefined;
}

export type CodeResult =
  | { ok: true; method: 'totp' | 'recovery' }
  | { ok: false; reason: 'invalid' }
  | { ok: false; reason: 'locked'; retryAfterSeconds: number };

function lockedSeconds(account: Pick<Account, 'totpLockedUntil'>, now: Date): number {
  if (!account.totpLockedUntil || account.totpLockedUntil <= now) return 0;
  return Math.max(1, Math.ceil((account.totpLockedUntil.getTime() - now.getTime()) / 1000));
}

/**
 * Counts a wrong code. At the limit the account is locked for a while and the failure counter
 * starts again; both the failure and the lock are written to the activity log.
 */
async function registerFailure(
  db: Database,
  settings: AdminSettings,
  account: Account,
  ip: string,
  now: Date,
): Promise<CodeResult> {
  const [row] = await db
    .update(adminAccounts)
    .set({ totpFailures: sql`${adminAccounts.totpFailures} + 1` })
    .where(eq(adminAccounts.id, account.id))
    .returning({ failures: adminAccounts.totpFailures });
  const base = { actor: account.displayName, target: account.displayName, ip };
  if ((row?.failures ?? 0) >= settings.codeMaxFailures) {
    const until = new Date(now.getTime() + settings.codeLockMinutes * 60_000);
    await db
      .update(adminAccounts)
      .set({ totpFailures: 0, totpLockedUntil: until })
      .where(eq(adminAccounts.id, account.id));
    await recordActivity(db, { action: 'totp_locked', ...base });
    return { ok: false, reason: 'locked', retryAfterSeconds: settings.codeLockMinutes * 60 };
  }
  await recordActivity(db, { action: 'totp_failed', ...base });
  return { ok: false, reason: 'invalid' };
}

async function resetFailures(db: Database, accountId: string): Promise<void> {
  await db
    .update(adminAccounts)
    .set({ totpFailures: 0, totpLockedUntil: null })
    .where(eq(adminAccounts.id, accountId));
}

/** The number of recovery codes still usable. */
export async function remainingRecoveryCodes(db: Database, accountId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(adminRecoveryCodes)
    .where(and(eq(adminRecoveryCodes.accountId, accountId), isNull(adminRecoveryCodes.usedAt)));
  return row?.total ?? 0;
}

/**
 * Checks what an admin typed at the code step: an authenticator code (6 digits) or a recovery
 * code. Wrong codes are counted per account; recovery codes count too, as they are guesses too.
 */
export async function verifyCode(
  db: Database,
  settings: AdminSettings,
  account: Account,
  input: string,
  ip: string,
  now = new Date(),
): Promise<CodeResult> {
  const wait = lockedSeconds(account, now);
  if (wait > 0) return { ok: false, reason: 'locked', retryAfterSeconds: wait };
  if (account.totpSecret === null) return { ok: false, reason: 'invalid' };

  const digits = input.replace(/\s/g, '');
  if (/^\d{6}$/.test(digits)) {
    const check = checkTotp(
      decryptText(account.totpSecret, settings.encryptionKey),
      digits,
      now,
      account.totpLastStep,
    );
    if (check.status === 'ok') {
      // The step is claimed in the database, so two requests with the same code cannot both pass.
      const claimed = await db
        .update(adminAccounts)
        .set({ totpLastStep: check.step, totpFailures: 0, totpLockedUntil: null })
        .where(
          and(
            eq(adminAccounts.id, account.id),
            or(isNull(adminAccounts.totpLastStep), lt(adminAccounts.totpLastStep, check.step)),
          ),
        )
        .returning({ id: adminAccounts.id });
      if (claimed.length > 0) return { ok: true, method: 'totp' };
    }
    return registerFailure(db, settings, account, ip, now);
  }

  const recovery = normalizeRecoveryCode(input);
  if (recovery !== undefined) {
    const used = await db
      .update(adminRecoveryCodes)
      .set({ usedAt: now })
      .where(
        and(
          eq(adminRecoveryCodes.accountId, account.id),
          eq(adminRecoveryCodes.codeHash, keyedHash(recovery, settings.encryptionKey)),
          isNull(adminRecoveryCodes.usedAt),
        ),
      )
      .returning({ id: adminRecoveryCodes.id });
    if (used.length > 0) {
      await resetFailures(db, account.id);
      const remaining = await remainingRecoveryCodes(db, account.id);
      await recordActivity(db, {
        action: 'recovery_used',
        actor: account.displayName,
        target: `${account.displayName} (${String(remaining)} restants)`,
        ip,
      });
      return { ok: true, method: 'recovery' };
    }
  }
  return registerFailure(db, settings, account, ip, now);
}

export interface PendingSetup {
  /** The key as text, in groups of four letters. */
  secretText: string;
  /** The same key without spaces. */
  secret: string;
  uri: string;
  /** The QR code, inline SVG. */
  svg: string;
}

/** The secret waiting for confirmation, or undefined when none was started. */
export function readPendingSetup(
  account: Account,
  settings: AdminSettings,
): PendingSetup | undefined {
  if (account.totpPendingSecret === null) return undefined;
  const secret = decryptText(account.totpPendingSecret, settings.encryptionKey);
  const uri = otpauthUri({ secret, account: account.email, issuer: totpIssuer });
  return {
    secret,
    secretText: groupSecret(secret),
    uri,
    svg: qrSvg(uri, 'Code QR à scanner avec l’application d’authentification'),
  };
}

/** Starts a setup: a new secret (160 bits), kept encrypted until a valid code confirms it. */
export async function startSetup(
  db: Database,
  settings: AdminSettings,
  account: Account,
): Promise<Account> {
  const [updated] = await db
    .update(adminAccounts)
    .set({ totpPendingSecret: encryptText(generateTotpSecret(), settings.encryptionKey) })
    .where(eq(adminAccounts.id, account.id))
    .returning();
  return updated ?? account;
}

/** Drops a setup that was started and not confirmed. */
export async function cancelSetup(db: Database, accountId: string): Promise<void> {
  await db
    .update(adminAccounts)
    .set({ totpPendingSecret: null })
    .where(eq(adminAccounts.id, accountId));
}

export type ConfirmResult =
  | { ok: true; replaced: boolean; recoveryCodes: string[] | undefined }
  | { ok: false; reason: 'invalid' | 'no_setup' }
  | { ok: false; reason: 'locked'; retryAfterSeconds: number };

async function storeRecoveryCodes(
  db: Database,
  settings: AdminSettings,
  accountId: string,
): Promise<string[]> {
  const codes = Array.from({ length: recoveryCodeCount }, () => generateRecoveryCode());
  await db.transaction(async (tx) => {
    await tx.delete(adminRecoveryCodes).where(eq(adminRecoveryCodes.accountId, accountId));
    await tx.insert(adminRecoveryCodes).values(
      codes.map((code) => ({
        accountId,
        codeHash: keyedHash(normalizeRecoveryCode(code) ?? code, settings.encryptionKey),
      })),
    );
  });
  return codes;
}

/**
 * Saves the pending secret once the admin types a valid code for it. The first setup also creates
 * the recovery codes, returned here and never again; replacing the app keeps the existing ones.
 */
export async function confirmSetup(
  db: Database,
  settings: AdminSettings,
  account: Account,
  input: string,
  ip: string,
  now = new Date(),
): Promise<ConfirmResult> {
  const wait = lockedSeconds(account, now);
  if (wait > 0) return { ok: false, reason: 'locked', retryAfterSeconds: wait };
  const pending = readPendingSetup(account, settings);
  if (!pending || account.totpPendingSecret === null) return { ok: false, reason: 'no_setup' };

  const check = checkTotp(pending.secret, input.replace(/\s/g, ''), now, null);
  if (check.status !== 'ok') {
    const failure = await registerFailure(db, settings, account, ip, now);
    return failure.ok ? { ok: false, reason: 'invalid' } : failure;
  }

  const replaced = account.totpSecret !== null;
  await db
    .update(adminAccounts)
    .set({
      totpSecret: account.totpPendingSecret,
      totpPendingSecret: null,
      totpLastStep: check.step,
      totpFailures: 0,
      totpLockedUntil: null,
    })
    .where(eq(adminAccounts.id, account.id));
  const recoveryCodes = replaced ? undefined : await storeRecoveryCodes(db, settings, account.id);
  await recordActivity(db, {
    action: replaced ? 'totp_replaced' : 'totp_enabled',
    actor: account.displayName,
    target: account.displayName,
    ip,
  });
  return { ok: true, replaced, recoveryCodes };
}

/**
 * Starts the replacement of the authenticator app. A current code is required (an authenticator
 * code or a recovery code); the new secret then has to be confirmed like at the first setup.
 */
export async function beginReplacement(
  db: Database,
  settings: AdminSettings,
  account: Account,
  currentCode: string,
  ip: string,
  now = new Date(),
): Promise<CodeResult> {
  const result = await verifyCode(db, settings, account, currentCode, ip, now);
  if (result.ok) await startSetup(db, settings, account);
  return result;
}

/** A new set of recovery codes. The old set stops working at once. */
export async function regenerateRecoveryCodes(
  db: Database,
  settings: AdminSettings,
  account: Account,
  ip: string,
): Promise<string[]> {
  const codes = await storeRecoveryCodes(db, settings, account.id);
  await recordActivity(db, {
    action: 'recovery_regenerated',
    actor: account.displayName,
    target: account.displayName,
    ip,
  });
  return codes;
}

/**
 * Removes the second factor of another admin: their secret and recovery codes go, their sessions
 * end, and they must set a new one at their next login. Nobody can do this to their own account,
 * which would leave it without a second factor.
 */
export async function resetSecondFactor(
  db: Database,
  accountId: string,
  actor: Actor,
  ownAccountId?: string,
): Promise<Result<{ account: Account }>> {
  if (ownAccountId !== undefined && ownAccountId === accountId) {
    return { ok: false, error: 'own_second_factor' };
  }
  const [target] = await db.select().from(adminAccounts).where(eq(adminAccounts.id, accountId));
  if (!target) return { ok: false, error: 'not_found' };
  if (target.totpSecret === null) return { ok: false, error: 'no_second_factor' };
  const [account] = await db
    .update(adminAccounts)
    .set({
      totpSecret: null,
      totpPendingSecret: null,
      totpLastStep: null,
      totpFailures: 0,
      totpLockedUntil: null,
    })
    .where(eq(adminAccounts.id, accountId))
    .returning();
  await db.delete(adminRecoveryCodes).where(eq(adminRecoveryCodes.accountId, accountId));
  await revokeSessions(db, accountId);
  await recordActivity(db, {
    action: 'totp_reset',
    actor: actor.name,
    target: target.displayName,
    ip: actor.ip,
  });
  return { ok: true, account: account ?? target };
}

/**
 * Stores a known secret for an account (server command, to prepare test accounts). No recovery
 * codes are created: the account can make a set from its own page.
 */
export async function installTotpSecret(
  db: Database,
  settings: AdminSettings,
  accountId: string,
  secret: string,
): Promise<void> {
  await db
    .update(adminAccounts)
    .set({ totpSecret: encryptText(secret, settings.encryptionKey), totpLastStep: null })
    .where(eq(adminAccounts.id, accountId));
}
