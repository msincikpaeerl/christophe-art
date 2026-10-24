import type { Config } from '../config.ts';

/** The admin settings that come from the environment (see .env.example). */
export interface AdminSettings {
  loginMaxFailuresPerAccount: number;
  loginMaxFailuresPerIp: number;
  loginWindowMinutes: number;
  sessionIdleMinutes: number;
  sessionMaxHours: number;
  /** Wrong codes allowed in a row before the account is locked. */
  codeMaxFailures: number;
  /** Minutes an account stays locked. */
  codeLockMinutes: number;
  /** Minutes the code step stays open after the password. */
  codeStepMinutes: number;
  /** Key (32 bytes) that encrypts the second-factor secrets and keys the recovery code hashes. */
  encryptionKey: Buffer;
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
    codeMaxFailures: config.ADMIN_CODE_MAX_FAILURES,
    codeLockMinutes: config.ADMIN_CODE_LOCK_MINUTES,
    codeStepMinutes: config.ADMIN_CODE_STEP_MINUTES,
    encryptionKey: Buffer.from(config.ADMIN_ENCRYPTION_KEY, 'base64'),
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
