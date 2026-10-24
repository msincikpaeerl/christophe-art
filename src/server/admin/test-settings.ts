import type { AdminSettings } from './settings.ts';

/** Settings for the tests: the defaults of .env.example, a known site address. */
export const testSettings: AdminSettings = {
  loginMaxFailuresPerAccount: 5,
  loginMaxFailuresPerIp: 20,
  loginWindowMinutes: 15,
  sessionIdleMinutes: 60,
  sessionMaxHours: 12,
  trustProxy: false,
  siteUrl: 'https://site.example.test',
};
