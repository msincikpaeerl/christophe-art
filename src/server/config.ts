import { z } from 'zod';

/** Accepts a PostgreSQL URL, or `pglite://memory` (in-process database, development and tests only). */
const databaseUrl = z.string().refine((value) => /^(postgres(ql)?|pglite):\/\//.test(value), {
  message: 'must start with postgres://, postgresql:// or pglite://',
});

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4321),
    DATABASE_URL: databaseUrl,
    UPLOADS_DIR: z.string().min(1).default('./uploads'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    /** Public address of the site (no trailing path), used for canonical and hreflang links. */
    SITE_URL: z
      .string()
      .refine((value) => /^https?:\/\/[^/\s]+\/?$/.test(value), {
        message: 'must be an http:// or https:// address without a path',
      })
      .transform((value) => value.replace(/\/$/, ''))
      .optional(),
    /** Failed logins allowed per account (login email, even unknown) inside the window. */
    ADMIN_LOGIN_MAX_FAILURES_PER_ACCOUNT: z.coerce.number().int().min(1).max(1000).default(5),
    /** Failed logins allowed per IP address inside the window. */
    ADMIN_LOGIN_MAX_FAILURES_PER_IP: z.coerce.number().int().min(1).max(100000).default(20),
    /** Length of the failed-login window, in minutes. */
    ADMIN_LOGIN_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
    /** An admin session ends after this many minutes without activity. */
    ADMIN_SESSION_IDLE_MINUTES: z.coerce.number().int().min(1).max(10080).default(60),
    /** An admin session ends this many hours after login, whatever the activity. */
    ADMIN_SESSION_MAX_HOURS: z.coerce.number().int().min(1).max(720).default(12),
    /** Behind a reverse proxy: take the client address from X-Forwarded-For (last entry). */
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    /** Serves the design showcase page (`/dev/design`). Off by default; never enable in production. */
    DEV_PAGES: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .refine((env) => !(env.NODE_ENV === 'production' && env.DATABASE_URL.startsWith('pglite://')), {
    path: ['DATABASE_URL'],
    message: 'pglite:// is not allowed in production, use a PostgreSQL URL',
  });

export type Config = z.infer<typeof schema>;

/** Raised when the environment is incomplete or invalid; the message names every faulty variable. */
export class ConfigError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid configuration:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

/** Reads and validates the configuration. Never includes a variable's value in an error. */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const result = schema.safeParse(env);
  if (result.success) return result.data;
  throw new ConfigError(
    result.error.issues.map((issue) => {
      const name = issue.path.join('.') || 'environment';
      const missing = issue.code === 'invalid_type' && env[name] === undefined;
      return `${name}: ${missing ? 'is required but missing' : issue.message}`;
    }),
  );
}
