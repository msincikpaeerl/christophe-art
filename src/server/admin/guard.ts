import type { Database } from '../database.ts';
import type { ActiveSession } from './sessions.ts';
import { resolveSession } from './sessions.ts';
import type { AdminSettings } from './settings.ts';

export const loginPath = '/admin/connexion';
export const passwordPath = '/admin/mot-de-passe';
const logoutPath = '/admin/deconnexion';

/** The only admin pages a visitor without a session may reach. */
const publicPaths: readonly string[] = [loginPath];
/** The only pages an account with a temporary password may reach. */
const passwordChangePaths: readonly string[] = [passwordPath, logoutPath];

/**
 * The path as the router will see it: percent-decoded, slashes collapsed, trailing slash removed.
 * `undefined` when it cannot be decoded.
 */
function normalizePath(pathname: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const collapsed = decoded.replace(/\/{2,}/g, '/').replace(/\\/g, '/');
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
}

/** True for /admin and everything below it. Anything undecodable counts as admin (fail closed). */
export function isAdminPath(pathname: string): boolean {
  const path = normalizePath(pathname)?.toLowerCase();
  return path === undefined || path === '/admin' || path.startsWith('/admin/');
}

/** The address the browser sends in Origin for this site. */
function expectedOrigin(request: Request, settings: AdminSettings): string {
  return settings.siteUrl ?? new URL(request.url).origin;
}

/** True when the request cannot change anything (GET and HEAD). */
function isSafeMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}

/** The client address: the last X-Forwarded-For entry behind a trusted proxy, else the socket's. */
export function clientIp(
  request: Request,
  socketAddress: string | undefined,
  settings: AdminSettings,
): string {
  if (settings.trustProxy) {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim();
    if (forwarded) return forwarded;
  }
  return socketAddress ?? 'unknown';
}

export type GuardResult =
  { allowed: false; response: Response } | { allowed: true; active: ActiveSession | undefined };

function refuse(request: Request, status: number, location?: string): GuardResult {
  if (location !== undefined && isSafeMethod(request.method)) {
    return {
      allowed: false,
      response: new Response(null, { status: 303, headers: { Location: location } }),
    };
  }
  return { allowed: false, response: new Response(null, { status }) };
}

/**
 * The rules for every request under /admin, before any page runs:
 * 1. a request that changes something must carry the site's own Origin;
 * 2. every page except the login page needs a valid session;
 * 3. while the password is temporary, only the password change and the logout are reachable.
 */
export async function guardAdminRequest(input: {
  request: Request;
  db: Database;
  settings: AdminSettings;
  cookieToken: string | undefined;
  now?: Date;
}): Promise<GuardResult> {
  const { request, settings } = input;
  const path = normalizePath(new URL(request.url).pathname);

  if (
    !isSafeMethod(request.method) &&
    request.headers.get('origin') !== expectedOrigin(request, settings)
  ) {
    return refuse(request, 403);
  }

  const active = await resolveSession(input.db, input.cookieToken, settings, input.now);
  if (path !== undefined && publicPaths.includes(path)) return { allowed: true, active };
  if (!active) return refuse(request, 401, loginPath);
  if (path === undefined || !passwordChangePaths.includes(path)) {
    if (active.account.mustChangePassword) return refuse(request, 403, passwordPath);
  }
  return { allowed: true, active };
}
