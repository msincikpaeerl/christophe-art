import type { APIRoute } from 'astro';
import { getDatabase } from '../server/database.ts';
import { healthResponse } from '../server/health.ts';
import { getLogger } from '../server/logger.ts';

export const prerender = false;

export const GET: APIRoute = () =>
  healthResponse(async () => (await getDatabase()).db, getLogger());
