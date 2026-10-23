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
