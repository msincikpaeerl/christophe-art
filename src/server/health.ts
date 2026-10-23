import { sql } from 'drizzle-orm';
import type { Logger } from 'pino';
import type { Database } from './database.ts';

const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };

/**
 * Builds the /health answer: 200 when the database answers a query, 503 otherwise. The body never
 * carries the error: the details go to the log.
 */
export async function healthResponse(
  getDb: () => Promise<Database>,
  logger?: Logger,
): Promise<Response> {
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers });
  } catch (error) {
    logger?.error({ err: error }, 'health check failed');
    return new Response(JSON.stringify({ status: 'unavailable' }), { status: 503, headers });
  }
}
