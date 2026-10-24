import type { Config } from '../config.ts';

/** The admin settings that come from the environment (see .env.example). */
export interface AdminSettings {
  loginMaxFailuresPerAccount: number;
  loginMaxFailuresPerIp: number;
  loginWindowMinutes: number;
  sessionIdleMinutes: number;
  sessionMaxHours: number;
  trustProxy: boolean;
  /** Public address of the site, to compare with the Origin header; undefined = use the request's. */
  siteUrl: string | undefined;
}

export function adminSettings(config: Config): AdminSettings {
  return {
    loginMaxFailuresPerAccount: config.ADMIN_LOGIN_MAX_FAILURES_PER_ACCOUNT,
    loginMaxFailuresPerIp: config.ADMIN_LOGIN_MAX_FAILURES_PER_IP,
    loginWindowMinutes: config.ADMIN_LOGIN_WINDOW_MINUTES,
    sessionIdleMinutes: config.ADMIN_SESSION_IDLE_MINUTES,
    sessionMaxHours: config.ADMIN_SESSION_MAX_HOURS,
    trustProxy: config.TRUST_PROXY,
    siteUrl: config.SITE_URL,
  };
}

export const sessionCookieName = 'admin_session';

/** Cookie attributes: HttpOnly, Secure, SameSite=Strict, only sent to /admin. */
export function sessionCookieOptions(settings: AdminSettings) {
  return {
    path: '/admin',
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: settings.sessionMaxHours * 3600,
  } as const;
}
