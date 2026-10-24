import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, desc, eq, ne } from 'drizzle-orm';
import type { Database } from '../database.ts';
import { adminAccounts, adminSessions } from '../schema.ts';
import type { AdminSettings } from './settings.ts';

/** 256 bits of randomness. */
const tokenBytes = 32;
/** The last-activity date is refreshed at most this often, to spare the database. */
const touchIntervalMs = 60_000;

export type Account = typeof adminAccounts.$inferSelect;
export type Session = typeof adminSessions.$inferSelect;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface NewSession {
  /** The secret to put in the cookie. Only its hash is stored. */
  token: string;
  id: string;
}

/** Opens a session with a brand-new token. `factors` lists what was verified (`password`). */
export async function createSession(
  db: Database,
  input: { accountId: string; factors: string[]; userAgent: string; ip: string },
  now = new Date(),
): Promise<NewSession> {
  const token = randomBytes(tokenBytes).toString('base64url');
  const id = randomUUID();
  await db.insert(adminSessions).values({
    id,
    accountId: input.accountId,
    tokenHash: hashToken(token),
    factors: input.factors,
    createdAt: now,
    lastActivityAt: now,
    userAgent: input.userAgent.slice(0, 300),
    ip: input.ip.slice(0, 64),
  });
  return { token, id };
}

export interface ActiveSession {
  session: Session;
  account: Account;
}

/**
 * The session behind a cookie token, or undefined when the token is unknown, the session is idle
 * or too old (it is then deleted), or the account is disabled.
 */
export async function resolveSession(
  db: Database,
  token: string | undefined,
  settings: AdminSettings,
  now = new Date(),
): Promise<ActiveSession | undefined> {
  if (!token) return undefined;
  const [row] = await db
    .select({ session: adminSessions, account: adminAccounts })
    .from(adminSessions)
    .innerJoin(adminAccounts, eq(adminSessions.accountId, adminAccounts.id))
    .where(eq(adminSessions.tokenHash, hashToken(token)));
  if (!row) return undefined;
  const idleMs = settings.sessionIdleMinutes * 60_000;
  const maxMs = settings.sessionMaxHours * 3_600_000;
  const expired =
    now.getTime() - row.session.lastActivityAt.getTime() > idleMs ||
    now.getTime() - row.session.createdAt.getTime() > maxMs;
  if (expired || row.account.status !== 'active') {
    await db.delete(adminSessions).where(eq(adminSessions.id, row.session.id));
    return undefined;
  }
  if (now.getTime() - row.session.lastActivityAt.getTime() > touchIntervalMs) {
    await db
      .update(adminSessions)
      .set({ lastActivityAt: now })
      .where(eq(adminSessions.id, row.session.id));
    return { session: { ...row.session, lastActivityAt: now }, account: row.account };
  }
  return row;
}

/** The account's sessions, most recently active first. */
export function listSessions(db: Database, accountId: string): Promise<Session[]> {
  return db
    .select()
    .from(adminSessions)
    .where(eq(adminSessions.accountId, accountId))
    .orderBy(desc(adminSessions.lastActivityAt));
}

/** Ends one session of the account. False when it does not exist or belongs to someone else. */
export async function revokeSession(
  db: Database,
  accountId: string,
  sessionId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(adminSessions)
    .where(and(eq(adminSessions.id, sessionId), eq(adminSessions.accountId, accountId)))
    .returning({ id: adminSessions.id });
  return deleted.length > 0;
}

/** Ends every session of the account, except `exceptSessionId`. Returns how many were ended. */
export async function revokeSessions(
  db: Database,
  accountId: string,
  exceptSessionId?: string,
): Promise<number> {
  const deleted = await db
    .delete(adminSessions)
    .where(
      exceptSessionId === undefined
        ? eq(adminSessions.accountId, accountId)
        : and(eq(adminSessions.accountId, accountId), ne(adminSessions.id, exceptSessionId)),
    )
    .returning({ id: adminSessions.id });
  return deleted.length;
}

/** Ends the session that owns this cookie token. */
export async function endSessionByToken(db: Database, token: string): Promise<void> {
  await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token)));
}
