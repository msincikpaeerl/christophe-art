import { and, asc, eq, gt, lt } from 'drizzle-orm';
import type { Database } from '../database.ts';
import { adminAccounts, adminLoginFailures } from '../schema.ts';
import { normalizeEmail } from './accounts.ts';
import { recordActivity } from './activity.ts';
import { verifyAgainstDummy, verifyPassword } from './password.ts';
import { createSession } from './sessions.ts';
import type { AdminSettings } from './settings.ts';

export type LoginResult =
  | { ok: true; token: string; mustChangePassword: boolean }
  | { ok: false; reason: 'invalid' }
  | { ok: false; reason: 'limited'; retryAfterSeconds: number };

type FailureKind = 'account' | 'ip';

/** Seconds to wait before `key` is allowed to try again; 0 when it is not limited. */
async function waitSeconds(
  db: Database,
  kind: FailureKind,
  key: string,
  max: number,
  settings: AdminSettings,
  now: Date,
): Promise<number> {
  const windowMs = settings.loginWindowMinutes * 60_000;
  const failures = await db
    .select({ at: adminLoginFailures.at })
    .from(adminLoginFailures)
    .where(
      and(
        eq(adminLoginFailures.kind, kind),
        eq(adminLoginFailures.key, key),
        gt(adminLoginFailures.at, new Date(now.getTime() - windowMs)),
      ),
    )
    .orderBy(asc(adminLoginFailures.at));
  if (failures.length < max) return 0;
  // The limit lifts when enough of the oldest failures leave the window.
  const decisive = failures[failures.length - max];
  return Math.max(
    1,
    Math.ceil(((decisive?.at.getTime() ?? now.getTime()) + windowMs - now.getTime()) / 1000),
  );
}

async function recordFailure(
  db: Database,
  email: string,
  ip: string,
  settings: AdminSettings,
  now: Date,
) {
  await db
    .delete(adminLoginFailures)
    .where(
      lt(adminLoginFailures.at, new Date(now.getTime() - settings.loginWindowMinutes * 60_000)),
    );
  await db.insert(adminLoginFailures).values([
    { kind: 'account', key: email, at: now },
    { kind: 'ip', key: ip, at: now },
  ]);
}

/**
 * Checks a login. A wrong password, an unknown email and a disabled account give the same answer
 * and take the same time (a password check is always done). Failures are limited per account
 * (the email typed, even when unknown) and per IP address.
 */
export async function attemptLogin(
  db: Database,
  settings: AdminSettings,
  input: { email: string; password: string; ip: string; userAgent: string },
  now = new Date(),
): Promise<LoginResult> {
  const email = normalizeEmail(input.email).slice(0, 254);
  const waits = await Promise.all([
    waitSeconds(db, 'account', email, settings.loginMaxFailuresPerAccount, settings, now),
    waitSeconds(db, 'ip', input.ip, settings.loginMaxFailuresPerIp, settings, now),
  ]);
  const retryAfterSeconds = Math.max(...waits);
  if (retryAfterSeconds > 0) return { ok: false, reason: 'limited', retryAfterSeconds };

  const [account] = await db.select().from(adminAccounts).where(eq(adminAccounts.email, email));
  const passwordOk = account
    ? await verifyPassword(input.password, account.passwordHash)
    : await verifyAgainstDummy(input.password);

  if (!account || !passwordOk || account.status !== 'active') {
    await recordFailure(db, email, input.ip, settings, now);
    await recordActivity(db, { action: 'login_failed', actor: email, ip: input.ip });
    return { ok: false, reason: 'invalid' };
  }

  await db
    .delete(adminLoginFailures)
    .where(and(eq(adminLoginFailures.kind, 'account'), eq(adminLoginFailures.key, email)));
  await db.update(adminAccounts).set({ lastLoginAt: now }).where(eq(adminAccounts.id, account.id));
  const session = await createSession(
    db,
    { accountId: account.id, factors: ['password'], userAgent: input.userAgent, ip: input.ip },
    now,
  );
  await recordActivity(db, {
    action: 'login',
    actor: account.displayName,
    ip: input.ip,
  });
  return { ok: true, token: session.token, mustChangePassword: account.mustChangePassword };
}
