import { boolean, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Free-form key/value pairs about the installation. Real tables arrive with the features. */
export const appMeta = pgTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** People who manage the site. Every account has the same rights. */
export const adminAccounts = pgTable('admin_accounts', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name').notNull(),
  /** Login identifier, stored in lower case. Never used to send mail. */
  email: text('email').notNull().unique(),
  /** `active` or `disabled`. */
  status: text('status').notNull(),
  /** Argon2id hash in the PHC string format. */
  passwordHash: text('password_hash').notNull(),
  /** True while the password is a temporary one: the only page allowed is the password change. */
  mustChangePassword: boolean('must_change_password').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});

/** Login sessions. The cookie holds a random token; only its SHA-256 hash is stored. */
export const adminSessions = pgTable(
  'admin_sessions',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => adminAccounts.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    /** Factors verified for this session, for example `password`. A second factor adds to it. */
    factors: text('factors').array().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
    userAgent: text('user_agent').notNull(),
    ip: text('ip').notNull(),
  },
  (table) => [index('admin_sessions_account_idx').on(table.accountId)],
);

/** Failed logins, for the limits. `kind` is `account` (key: login email) or `ip`. */
export const adminLoginFailures = pgTable(
  'admin_login_failures',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    kind: text('kind').notNull(),
    key: text('key').notNull(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('admin_login_failures_key_idx').on(table.kind, table.key, table.at)],
);

/** Activity log of account actions. Names are copied, so the log survives changes. */
export const adminActivity = pgTable(
  'admin_activity',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    action: text('action').notNull(),
    /** Who did it: an account name, a login email for a failed login, or the server command. */
    actor: text('actor').notNull(),
    target: text('target'),
    ip: text('ip').notNull(),
  },
  (table) => [index('admin_activity_at_idx').on(table.at)],
);
