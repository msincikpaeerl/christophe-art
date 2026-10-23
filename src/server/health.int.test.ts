import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../test-support/database.ts';
import type { TestDatabase } from '../test-support/database.ts';
import { healthResponse } from './health.ts';

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
});

afterAll(async () => {
  await testDb.dispose();
});

describe('healthResponse', () => {
  it('answers 200 when the database is reachable', async () => {
    const response = await healthResponse(() => Promise.resolve(testDb.db));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('answers 503 when the database cannot be opened', async () => {
    const response = await healthResponse(() => Promise.reject(new Error('connection refused')));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unavailable' });
  });

  it('answers 503 when the database stops answering', async () => {
    const closed = await createTestDatabase();
    const db = closed.db;
    await closed.dispose();
    const response = await healthResponse(() => Promise.resolve(db));
    expect(response.status).toBe(503);
  });
});
