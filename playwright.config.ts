import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';

// Central location for the authenticated storage state produced by the auth setup project.
// This file is added to .gitignore so it never leaves the developer machine/CI runtime.
const authFile = 'tests/playwright/.auth/user.json';
const skipAuthSetup = process.env.SKIP_AUTH_SETUP === '1';

// Decide if we need to run the setup project this invocation.
// Conditions: missing file OR REFRESH_AUTH=1 OR file older than AUTH_MAX_AGE_HOURS (default 12)
function needsAuthSetup(): boolean {
  if (skipAuthSetup) return false;
  if (process.env.REFRESH_AUTH === '1') return true;
  if (!fs.existsSync(authFile)) return true;
  try {
    const maxAgeHours = Number(process.env.AUTH_MAX_AGE_HOURS || 12);
    const { mtimeMs } = fs.statSync(authFile);
    const ageMs = Date.now() - mtimeMs;
    return ageMs >= maxAgeHours * 3600_000;
  } catch {
    return true;
  }
}

const includeSetup = needsAuthSetup();
const hasAuthFile = fs.existsSync(authFile);
const storageStatePath = skipAuthSetup && !hasAuthFile ? undefined : authFile;
if (!includeSetup) {
  console.log(
    'Playwright auth setup project skipped (existing auth state considered fresh). Set REFRESH_AUTH=1 to force.',
  );
}

const projects = [
  ...(includeSetup
    ? [
        {
          name: 'setup',
          testMatch: /auth\.setup\.ts/,
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : []),
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      ...(storageStatePath ? { storageState: storageStatePath } : {}),
    },
    ...(includeSetup ? { dependencies: ['setup'] } : {}),
  },
];

export default defineConfig({
  testDir: './tests/playwright',
  timeout: 60 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    locale: 'en-US',
  },
  projects,
  // Make the authFile path available to tests that may want to reference it dynamically.
  metadata: { authFile },
});
