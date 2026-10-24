import { randomUUID } from 'node:crypto';
import { asc, count, eq } from 'drizzle-orm';
import type { Database } from '../database.ts';
import { adminAccounts } from '../schema.ts';
import { recordActivity } from './activity.ts';
import type { PasswordProblem } from './password.ts';
import {
  generateTemporaryPassword,
  hashPassword,
  passwordProblem,
  verifyPassword,
} from './password.ts';
import type { Account } from './sessions.ts';
import { revokeSessions } from './sessions.ts';

export type { Account } from './sessions.ts';

/** Who performs an action, for the activity log. */
export interface Actor {
  /** Name written in the log. */
  name: string;
  ip: string;
}

export const displayNameMaxLength = 80;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type AccountError =
  | 'invalid_name'
  | 'invalid_email'
  | 'email_taken'
  | 'not_found'
  | 'last_active'
  | 'own_account'
  | 'wrong_current_password'
  | 'same_password'
  | PasswordProblem;

export type Result<T> = ({ ok: true } & T) | { ok: false; error: AccountError };

export interface CreatedAccount {
  account: Account;
  /** Shown once to the admin who creates the account; never stored in clear. */
  temporaryPassword: string;
}

/** Creates an active account with a temporary password that must be changed at first login. */
export async function createAccount(
  db: Database,
  input: { displayName: string; email: string; actor: Actor; temporaryPassword?: string },
): Promise<Result<CreatedAccount>> {
  const displayName = input.displayName.trim();
  const email = normalizeEmail(input.email);
  if (displayName === '' || displayName.length > displayNameMaxLength) {
    return { ok: false, error: 'invalid_name' };
  }
  if (!isValidEmail(email)) return { ok: false, error: 'invalid_email' };
  const temporaryPassword = input.temporaryPassword ?? generateTemporaryPassword();
  const problem = passwordProblem(temporaryPassword);
  if (problem) return { ok: false, error: problem };
  const [existing] = await db
    .select({ id: adminAccounts.id })
    .from(adminAccounts)
    .where(eq(adminAccounts.email, email));
  if (existing) return { ok: false, error: 'email_taken' };

  const [account] = await db
    .insert(adminAccounts)
    .values({
      id: randomUUID(),
      displayName,
      email,
      status: 'active',
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
    })
    .onConflictDoNothing()
    .returning();
  if (!account) return { ok: false, error: 'email_taken' };
  await recordActivity(db, {
    action: 'account_created',
    actor: input.actor.name,
    target: displayName,
    ip: input.actor.ip,
  });
  return { ok: true, account, temporaryPassword };
}

export function listAccounts(db: Database): Promise<Account[]> {
  return db
    .select()
    .from(adminAccounts)
    .orderBy(asc(adminAccounts.createdAt), asc(adminAccounts.email));
}

export async function findAccountByEmail(
  db: Database,
  email: string,
): Promise<Account | undefined> {
  const [account] = await db
    .select()
    .from(adminAccounts)
    .where(eq(adminAccounts.email, normalizeEmail(email)));
  return account;
}

export async function findAccountById(db: Database, id: string): Promise<Account | undefined> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const [account] = await db.select().from(adminAccounts).where(eq(adminAccounts.id, id));
  return account;
}

/** Disables an account and ends its sessions at once. The last active account cannot be disabled. */
export async function disableAccount(
  db: Database,
  accountId: string,
  actor: Actor,
): Promise<Result<{ account: Account }>> {
  const outcome = await db.transaction(async (tx): Promise<Result<{ account: Account }>> => {
    const [account] = await tx.select().from(adminAccounts).where(eq(adminAccounts.id, accountId));
    if (!account) return { ok: false, error: 'not_found' };
    if (account.status === 'active') {
      const [active] = await tx
        .select({ total: count() })
        .from(adminAccounts)
        .where(eq(adminAccounts.status, 'active'));
      if ((active?.total ?? 0) <= 1) return { ok: false, error: 'last_active' };
      await tx
        .update(adminAccounts)
        .set({ status: 'disabled' })
        .where(eq(adminAccounts.id, accountId));
    }
    await revokeSessions(tx, accountId);
    return { ok: true, account: { ...account, status: 'disabled' } };
  });
  if (outcome.ok) {
    await recordActivity(db, {
      action: 'account_disabled',
      actor: actor.name,
      target: outcome.account.displayName,
      ip: actor.ip,
    });
  }
  return outcome;
}

export async function enableAccount(
  db: Database,
  accountId: string,
  actor: Actor,
): Promise<Result<{ account: Account }>> {
  const [account] = await db
    .update(adminAccounts)
    .set({ status: 'active' })
    .where(eq(adminAccounts.id, accountId))
    .returning();
  if (!account) return { ok: false, error: 'not_found' };
  await recordActivity(db, {
    action: 'account_enabled',
    actor: actor.name,
    target: account.displayName,
    ip: actor.ip,
  });
  return { ok: true, account };
}

/**
 * Gives the account a new temporary password, ends all its sessions and requires a change at the
 * next login. `ownAccountId` (the admin doing it, when it is an admin) cannot be reset this way.
 */
export async function resetPassword(
  db: Database,
  accountId: string,
  actor: Actor,
  ownAccountId?: string,
): Promise<Result<{ account: Account; temporaryPassword: string }>> {
  if (ownAccountId !== undefined && ownAccountId === accountId) {
    return { ok: false, error: 'own_account' };
  }
  const temporaryPassword = generateTemporaryPassword();
  const [account] = await db
    .update(adminAccounts)
    .set({ passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true })
    .where(eq(adminAccounts.id, accountId))
    .returning();
  if (!account) return { ok: false, error: 'not_found' };
  await revokeSessions(db, accountId);
  await recordActivity(db, {
    action: 'password_reset',
    actor: actor.name,
    target: account.displayName,
    ip: actor.ip,
  });
  return { ok: true, account, temporaryPassword };
}

/**
 * An admin changes their own password. The current one is required; every other session of the
 * account ends (the one in use, `keepSessionId`, stays).
 */
export async function changeOwnPassword(
  db: Database,
  input: {
    account: Account;
    currentPassword: string;
    newPassword: string;
    keepSessionId: string;
    ip: string;
  },
): Promise<Result<{ changed: true }>> {
  if (!(await verifyPassword(input.currentPassword, input.account.passwordHash))) {
    return { ok: false, error: 'wrong_current_password' };
  }
  const problem = passwordProblem(input.newPassword);
  if (problem) return { ok: false, error: problem };
  if (input.newPassword === input.currentPassword) return { ok: false, error: 'same_password' };
  await db
    .update(adminAccounts)
    .set({ passwordHash: await hashPassword(input.newPassword), mustChangePassword: false })
    .where(eq(adminAccounts.id, input.account.id));
  await revokeSessions(db, input.account.id, input.keepSessionId);
  await recordActivity(db, {
    action: 'password_changed',
    actor: input.account.displayName,
    target: input.account.displayName,
    ip: input.ip,
  });
  return { ok: true, changed: true };
}
