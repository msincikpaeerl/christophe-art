import { readFileSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../test-support/database.ts';
import type { TestDatabase } from '../test-support/database.ts';
import { appMeta } from './schema.ts';

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
});

afterAll(async () => {
  await testDb.dispose();
});

describe('migrations', () => {
  it('bring a fresh database to the latest migration', async () => {
    const journal = JSON.parse(
      readFileSync(new URL('../../drizzle/meta/_journal.json', import.meta.url), 'utf8'),
    ) as { entries: unknown[] };

    await testDb.migrate();

    // Both drivers return `{ rows }`; the shared Database type does not say so.
    const result: unknown = await testDb.db.execute(
      sql`select count(*)::int as count from drizzle.__drizzle_migrations`,
    );
    const applied = result as { rows: { count: number }[] };
    expect(applied.rows[0]).toEqual({ count: journal.entries.length });

    await testDb.db.insert(appMeta).values({ key: 'k', value: 'v' });
    const rows = await testDb.db.select().from(appMeta);
    expect(rows).toHaveLength(1);
  });

  it('can be applied twice', async () => {
    await expect(testDb.migrate()).resolves.toBeUndefined();
  });
});
