import { count, desc } from 'drizzle-orm';
import type { Database } from '../database.ts';
import { adminActivity } from '../schema.ts';

export const activityActions = [
  'login',
  'login_failed',
  'logout',
  'account_created',
  'account_disabled',
  'account_enabled',
  'password_reset',
  'password_changed',
  'session_revoked',
  'totp_enabled',
  'totp_replaced',
  'totp_failed',
  'totp_locked',
  'recovery_used',
  'recovery_regenerated',
  'totp_reset',
] as const;

export type ActivityAction = (typeof activityActions)[number];

export interface ActivityInput {
  action: ActivityAction;
  /** Account name, login email (failed login) or `serverActor` (command run on the server). */
  actor: string;
  target?: string | undefined;
  ip: string;
}

/** Actor name used when an action comes from a command run on the server. */
export const serverActor = 'server';

export async function recordActivity(db: Database, input: ActivityInput): Promise<void> {
  await db.insert(adminActivity).values({
    action: input.action,
    actor: input.actor.slice(0, 300),
    target: input.target?.slice(0, 300) ?? null,
    ip: input.ip.slice(0, 64),
  });
}

export const activityPageSize = 25;

export interface ActivityPage {
  entries: (typeof adminActivity.$inferSelect)[];
  page: number;
  pageCount: number;
  total: number;
}

/** One page of the log, newest first. Pages count from 1; an out-of-range page is clamped. */
export async function listActivity(db: Database, requestedPage: number): Promise<ActivityPage> {
  const [totalRow] = await db.select({ total: count() }).from(adminActivity);
  const total = totalRow?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / activityPageSize));
  const page = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), pageCount);
  const entries = await db
    .select()
    .from(adminActivity)
    .orderBy(desc(adminActivity.at), desc(adminActivity.id))
    .limit(activityPageSize)
    .offset((page - 1) * activityPageSize);
  return { entries, page, pageCount, total };
}
