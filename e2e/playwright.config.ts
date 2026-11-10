import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the real stack (nginx + API + PostgreSQL),
 * started with `docker compose up` (see the root `e2e:docker` script).
 */
export default defineConfig({
  testDir: './tests',
  // One worker keeps ordering-sensitive assertions (newest users first,
  // pagination) deterministic; the suite is small.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Auth flow also checked on a phone-sized viewport.
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /auth\.spec\.ts/ },
  ],
});
