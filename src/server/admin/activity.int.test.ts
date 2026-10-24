import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test-support/database.ts';
import type { TestDatabase } from '../../test-support/database.ts';
import { activityPageSize, listActivity, recordActivity } from './activity.ts';

let testDb: TestDatabase;

beforeEach(async () => {
  testDb = await createTestDatabase();
  await testDb.migrate();
});

afterEach(async () => {
  await testDb.dispose();
});

describe('activity log', () => {
  it('records who, what, target, time and IP', async () => {
    await recordActivity(testDb.db, {
      action: 'account_disabled',
      actor: 'Alice',
      target: 'Bob',
      ip: '203.0.113.5',
    });
    const log = await listActivity(testDb.db, 1);
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]).toMatchObject({
      action: 'account_disabled',
      actor: 'Alice',
      target: 'Bob',
      ip: '203.0.113.5',
    });
    expect(log.entries[0]?.at).toBeInstanceOf(Date);
  });

  it('is empty at first, with one page', async () => {
    expect(await listActivity(testDb.db, 1)).toMatchObject({
      entries: [],
      page: 1,
      pageCount: 1,
      total: 0,
    });
  });

  it('pages the entries, newest first, and clamps an out-of-range page', async () => {
    const total = activityPageSize * 2 + 3;
    for (let index = 1; index <= total; index++) {
      await recordActivity(testDb.db, {
        action: 'login',
        actor: `user ${String(index)}`,
        ip: '::1',
      });
    }
    const first = await listActivity(testDb.db, 1);
    expect(first).toMatchObject({ page: 1, pageCount: 3, total });
    expect(first.entries).toHaveLength(activityPageSize);
    expect(first.entries[0]?.actor).toBe(`user ${String(total)}`);

    const last = await listActivity(testDb.db, 3);
    expect(last.entries).toHaveLength(3);
    expect(last.entries.at(-1)?.actor).toBe('user 1');

    expect((await listActivity(testDb.db, 99)).page).toBe(3);
    expect((await listActivity(testDb.db, -4)).page).toBe(1);
    expect((await listActivity(testDb.db, Number.NaN)).page).toBe(1);
  });
});
