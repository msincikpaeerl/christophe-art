import { fileURLToPath } from 'node:url';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type { Config } from './config.ts';
import { loadConfig } from './config.ts';

export type Database = PgDatabase<PgQueryResultHKT>;

export interface DatabaseHandle {
  db: Database;
  /** Applies every committed migration that is not applied yet. */
  migrate(): Promise<void>;
  close(): Promise<void>;
}

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

/**
 * Opens the database named by the URL: PostgreSQL in production, or `pglite://memory`, the same
 * engine running inside Node, for development and tests. PGlite is a dev dependency, so it is only
 * imported when asked for.
 */
export async function openDatabase(url: string): Promise<DatabaseHandle> {
  if (url.startsWith('pglite://')) {
    const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
      import('@electric-sql/pglite'),
      import('drizzle-orm/pglite'),
      import('drizzle-orm/pglite/migrator'),
    ]);
    // `pglite://memory` lives in memory; `pglite://<folder>` keeps its files in that folder, so
    // several processes can use the same data one after the other (end-to-end tests).
    const folder = url.slice('pglite://'.length);
    const client = folder === 'memory' ? new PGlite() : new PGlite(folder);
    const db = drizzle(client);
    return {
      db,
      migrate: () => migrate(db, { migrationsFolder }),
      close: () => client.close(),
    };
  }
  const [{ default: pg }, { drizzle }, { migrate }] = await Promise.all([
    import('pg'),
    import('drizzle-orm/node-postgres'),
    import('drizzle-orm/node-postgres/migrator'),
  ]);
  const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
  // A broken idle connection must not crash the process: the next query reports it.
  pool.on('error', () => undefined);
  const db = drizzle(pool);
  return {
    db,
    migrate: () => migrate(db, { migrationsFolder }),
    close: () => pool.end(),
  };
}

// The server entry and the pages are separate bundles in one process: share one connection.
const shared = Symbol.for('christophe-art.database');
type SharedStore = Record<symbol, Promise<DatabaseHandle> | undefined>;

/** The process-wide database, opened on first use from the validated configuration. */
export function getDatabase(config: Config = loadConfig()): Promise<DatabaseHandle> {
  const store = globalThis as unknown as SharedStore;
  const existing = store[shared];
  if (existing) return existing;
  const opened = openDatabase(config.DATABASE_URL);
  store[shared] = opened;
  return opened;
}
