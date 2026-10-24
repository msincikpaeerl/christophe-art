import type { AdminSettings } from './settings.ts';

/** Settings for the tests: the defaults of .env.example, a known site address. */
export const testSettings: AdminSettings = {
  loginMaxFailuresPerAccount: 5,
  loginMaxFailuresPerIp: 20,
  loginWindowMinutes: 15,
  sessionIdleMinutes: 60,
  sessionMaxHours: 12,
  codeMaxFailures: 5,
  codeLockMinutes: 15,
  codeStepMinutes: 5,
  encryptionKey: Buffer.alloc(32, 7),
  trustProxy: false,
  siteUrl: 'https://site.example.test',
};
