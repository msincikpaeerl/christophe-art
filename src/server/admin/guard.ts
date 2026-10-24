import type { Database } from '../database.ts';
import type { ActiveSession } from './sessions.ts';
import { accountHasSecondFactor, resolveSession, sessionHasSecondFactor } from './sessions.ts';
import type { AdminSettings } from './settings.ts';

export const loginPath = '/admin/connexion';
export const passwordPath = '/admin/mot-de-passe';
/** The code step after the password, for an account that has a second factor. */
export const codePath = '/admin/verification';
/** The setup screen for an account without a second factor (and its management page). */
export const setupPath = '/admin/double-authentification';
const logoutPath = '/admin/deconnexion';

/** The only admin pages a visitor without a session may reach. */
const publicPaths: readonly string[] = [loginPath];
/** The only pages an account with a temporary password may reach. */
const passwordChangePaths: readonly string[] = [passwordPath, logoutPath];
/** The only pages a session may reach between the password and the code. */
const codeStepPaths: readonly string[] = [codePath, logoutPath];
/** The only pages an account without a second factor may reach. */
const setupPaths: readonly string[] = [setupPath, logoutPath];

/**
 * Where an account must go next: the code step, the second factor setup, the password change,
 * or the admin itself. The guard lets a session reach this page and little else.
 */
export function landingPath(
  account: Parameters<typeof accountHasSecondFactor>[0] & { mustChangePassword: boolean },
  session: Parameters<typeof sessionHasSecondFactor>[0],
): string {
  if (!accountHasSecondFactor(account)) return setupPath;
  if (!sessionHasSecondFactor(session)) return codePath;
  return account.mustChangePassword ? passwordPath : '/admin/comptes';
}

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
 * 3. an account without a second factor reaches only its setup, and a session that has not typed
 *    its code yet reaches only the code step (the logout stays open in both cases);
 * 4. while the password is temporary, only the password change and the logout are reachable.
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
  const { account, session } = active;
  // The second factor comes before everything else: a password alone opens nothing.
  if (!accountHasSecondFactor(account)) {
    if (path === undefined || !setupPaths.includes(path)) return refuse(request, 403, setupPath);
  } else if (!sessionHasSecondFactor(session)) {
    if (path === undefined || !codeStepPaths.includes(path)) return refuse(request, 403, codePath);
  } else if (account.mustChangePassword) {
    if (path === undefined || !passwordChangePaths.includes(path)) {
      return refuse(request, 403, passwordPath);
    }
  }
  return { allowed: true, active };
}
