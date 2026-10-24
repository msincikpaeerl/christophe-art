// Runs before every page. Only /admin is concerned: the guard (src/server/admin/guard.ts) decides
// whether the request goes on, and every admin answer is kept out of search engines and caches.
import type { MiddlewareHandler } from 'astro';
import { clientIp, guardAdminRequest, isAdminPath } from './server/admin/guard.ts';
import { adminSettings, sessionCookieName } from './server/admin/settings.ts';
import { loadConfig } from './server/config.ts';
import { getDatabase } from './server/database.ts';

function hardened(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex');
  headers.set('Cache-Control', 'no-store');
  try {
    response.headers.set('X-Robots-Tag', 'noindex');
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    // Immutable headers (a response from fetch): copy the response.
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  if (!isAdminPath(context.url.pathname)) return next();

  const settings = adminSettings(loadConfig());
  const { db } = await getDatabase();
  const ip = clientIp(context.request, context.clientAddress, settings);
  const guard = await guardAdminRequest({
    request: context.request,
    db,
    settings,
    cookieToken: context.cookies.get(sessionCookieName)?.value,
  });
  if (!guard.allowed) return hardened(guard.response);

  context.locals.admin = { active: guard.active, ip, settings };
  return hardened(await next());
};
