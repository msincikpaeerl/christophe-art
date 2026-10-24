import { defineConfig, devices } from '@playwright/test';
import { adminAccounts, seedPassword } from './e2e/admin-accounts.ts';

const port = '4322';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: { baseURL: `http://127.0.0.1:${port}` },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  // Builds the site and starts it on its own, with a PGlite database kept in a folder: no Docker,
  // no PostgreSQL. The admin accounts of the tests are created first, by the server command.
  webServer: {
    command: [
      'rm -rf .e2e-db',
      'pnpm build',
      ...adminAccounts.map(
        (email) =>
          `pnpm admin:create --email ${email} --name "Admin ${email.split('@')[0] ?? ''}" --temporary-password ${seedPassword}`,
      ),
      'pnpm start',
    ].join(' && '),
    url: `http://127.0.0.1:${port}/health`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: port,
      DATABASE_URL: 'pglite://.e2e-db',
      // Many tests log in from the same address: only the per-account limit is exercised.
      ADMIN_LOGIN_MAX_FAILURES_PER_IP: '1000',
      LOG_LEVEL: 'warn',
      DEV_PAGES: 'true',
      SITE_URL: `http://127.0.0.1:${port}`,
    },
  },
});
