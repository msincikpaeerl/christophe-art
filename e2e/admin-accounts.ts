import { stepAt, totpCode } from '../src/server/admin/totp.ts';

/** Used by the cookie test only, which never changes its password. */
export const cookieAccount = 'root-cookie@example.test';

/** Admin accounts created before the end-to-end tests start (see playwright.config.ts). */
export const adminAccounts = [
  'root-desktop@example.test',
  'root-phone@example.test',
  'root-http-desktop@example.test',
  'root-http-phone@example.test',
  'root-factor-desktop@example.test',
  'root-factor-phone@example.test',
  cookieAccount,
];

/** Their temporary password: the accounts of the two projects change it at their first login. */
export const seedPassword = 'Temporaire-Seed-2026';

/** The authenticator secret of the seeded accounts (they start with a second factor). */
export const seedTotpSecret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

/** The key that encrypts the secrets in the end-to-end site (32 bytes, base64). */
export const e2eEncryptionKey = Buffer.alloc(32, 42).toString('base64');

const lastStepBySecret = new Map<string, number>();

/**
 * A code the site will accept now. A code works once, so when this process already used the code
 * of the current step it takes the next one, which the site accepts as clock drift (and then
 * waits for the clock to catch up). Several logins in a row are slow for this reason: tests that
 * only need to be signed in reuse a session instead of logging in again.
 */
export async function nextCode(secret: string, account: string): Promise<string> {
  const key = `${account}:${secret}`;
  let step = stepAt(new Date());
  const last = lastStepBySecret.get(key);
  if (last !== undefined && step <= last) step = last + 1;
  if (step > stepAt(new Date()) + 1) {
    // More than one step ahead: wait until the site would accept it.
    const waitMs = (step - 1) * 30_000 - Date.now() + 500;
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, waitMs)));
  }
  lastStepBySecret.set(key, step);
  return totpCode(secret, step);
}
