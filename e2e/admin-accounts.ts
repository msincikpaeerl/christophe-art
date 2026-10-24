/** Used by the cookie test only, which never changes its password. */
export const cookieAccount = 'root-cookie@example.test';

/** Admin accounts created before the end-to-end tests start (see playwright.config.ts). */
export const adminAccounts = [
  'root-desktop@example.test',
  'root-phone@example.test',
  'root-http-desktop@example.test',
  'root-http-phone@example.test',
  cookieAccount,
];

/** Their temporary password: the accounts of the two projects change it at their first login. */
export const seedPassword = 'Temporaire-Seed-2026';
