import { randomBytes } from 'node:crypto';
import pg from 'pg';
import type { DatabaseHandle } from '../server/database.ts';
import { openDatabase } from '../server/database.ts';

export interface TestDatabase extends DatabaseHandle {
  /** Closes the connection and removes the database. */
  dispose(): Promise<void>;
}

/**
 * A new, empty database for one test file. Without DATABASE_URL it is an in-memory PGlite; with
 * DATABASE_URL it is a freshly created database on that PostgreSQL server, dropped on dispose.
 * Migrations are not applied: call `migrate()` when the test needs the tables.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const serverUrl = process.env['DATABASE_URL'];
  if (!serverUrl || serverUrl.startsWith('pglite://')) {
    const handle = await openDatabase('pglite://memory');
    return { ...handle, dispose: () => handle.close() };
  }

  const name = `test_${randomBytes(8).toString('hex')}`;
  const admin = new pg.Client({ connectionString: serverUrl });
  await admin.connect();
  try {
    await admin.query(`create database "${name}"`);
  } finally {
    await admin.end();
  }
  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  const handle = await openDatabase(url.toString());
  return {
    ...handle,
    async dispose() {
      await handle.close();
      const cleaner = new pg.Client({ connectionString: serverUrl });
      await cleaner.connect();
      try {
        await cleaner.query(`drop database if exists "${name}" with (force)`);
      } finally {
        await cleaner.end();
      }
    },
  };
}
