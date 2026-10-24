import { defineConfig, devices } from '@playwright/test';

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
  // Builds the site and starts it on its own, with an in-memory database: no Docker, no PostgreSQL.
  webServer: {
    command: 'pnpm build && pnpm start',
    url: `http://127.0.0.1:${port}/health`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: port,
      DATABASE_URL: 'pglite://memory',
      LOG_LEVEL: 'warn',
      DEV_PAGES: 'true',
      SITE_URL: `http://127.0.0.1:${port}`,
    },
  },
});
