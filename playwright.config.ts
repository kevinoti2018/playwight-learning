import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */

import { ENV } from './config/env.schema';

export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  // Trade-off: fullyParallel speeds up CI significantly, but requires every
    // test to be fully independent — no shared state, no order assumptions.
    // We hit a real example of this NOT holding today (a Page Object method
    // that silently assumed a prior navigation) — worth fixing that class of
    // bug fully before trusting this setting blindly.
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  // Fails the build if someone commits `.only()` — protects CI from
  // silently running a subset of the suite. Not needed locally, since
  // `.only()` is genuinely useful while actively developing a test.
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  // Trade-off: retries mask flakiness if set too high. 2 in CI absorbs
  // transient network blips against a real external site (saucedemo.com)
  // without hiding genuine bugs. 0 locally — failures should be visible
  // immediately while iterating, not silently retried away.
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  // CI runners are shared/resource-constrained — capping workers there is
  // deliberate. Locally, undefined lets Playwright use all available cores.
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */

  reporter: [['html'], ['list']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: ENV.BASE_URL,

    // Three distinct timeout layers, each catching a different kind of hang:
    //   actionTimeout     — a single interaction (click, fill, selectOption)
    //   navigationTimeout — a page load / goto()
    //   (global `timeout` below) — the entire test, regardless of which
    //   step is slow
    // Bumped in CI specifically because shared runners are measurably
    // slower than a local machine hitting the same live site — this isn't
    // masking bugs, it's removing "CI is just slower" as a false signal.
    actionTimeout: process.env.CI ? 15_000 : 10_000,
    navigationTimeout: process.env.CI ? 20_000 : 15_000,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  // Whole-test timeout — separate from the per-action ones above.
    timeout: process.env.CI ? 45_000 : 30_000,

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch:/.\.setup\.ts/
    },
    {
      name: 'chromium',
      use: {
         ...devices['Desktop Chrome'],
         storageState: 'playwright/.auth/user.json',
       },
      dependencies: ['setup'],
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
