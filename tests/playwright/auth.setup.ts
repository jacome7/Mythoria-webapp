import { test as setup, expect } from './support/fixtures';
import fs from 'fs';
import path from 'path';
import { signInWithClerkTicket } from './support/sign-in';

// Auth storage state (gitignored)
const authFile = 'tests/playwright/.auth/user.json';

// Allow completely skipping auth setup for anonymous-only test runs.
// Usage: set SKIP_AUTH_SETUP=1 (PowerShell: $env:SKIP_AUTH_SETUP="1") before running Playwright.
if (process.env.SKIP_AUTH_SETUP === '1') {
  // Mark the single test in this file as skipped immediately.
  setup.skip(true, 'SKIP_AUTH_SETUP=1 -> skipping authentication setup for anonymous tests.');
}

// Allow skipping a fresh existing auth file so we don't force a manual login every run.
// Controls:
//   REFRESH_AUTH=1  -> force re-auth regardless of file age
//   AUTH_MAX_AGE_HOURS (default 12) -> max acceptable age before refresh
// If the file exists and is younger than AUTH_MAX_AGE_HOURS, we skip this setup test.
(() => {
  try {
    if (process.env.REFRESH_AUTH === '1') return; // explicit refresh requested
    if (!fs.existsSync(authFile)) return; // no existing state
    const maxAgeHours = Number(process.env.AUTH_MAX_AGE_HOURS || 12);
    const { mtimeMs } = fs.statSync(authFile);
    const ageMs = Date.now() - mtimeMs;
    if (ageMs < maxAgeHours * 3600_000) {
      const ageH = (ageMs / 3600_000).toFixed(2);
      console.log(
        `Existing auth state age: ${ageH}h (< ${maxAgeHours}h). Skipping manual auth setup. Set REFRESH_AUTH=1 to force refresh.`,
      );
      // Skip the whole file (only test) so Playwright moves on; chromium project still loads storageState.
      setup.skip(true, 'Auth state fresh; skipping re-login.');
    }
  } catch (e) {
    console.warn('Auth setup freshness check failed (continuing with manual auth):', e);
  }
})();

function ensureDir(p: string) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Use a ticket for a pre-provisioned dev identity when requested, or wait for a headed login.
setup('authenticate and save a browser session', async ({ page, baseURL }) => {
  const email = process.env.CLERK_E2E_EMAIL; // optional prefill for magic link
  const manualTimeout = Number(process.env.MANUAL_AUTH_TIMEOUT_MS || 180000);
  setup.setTimeout(manualTimeout + 30_000);

  ensureDir(authFile);

  if (process.env.PLAYWRIGHT_CLERK_TICKET_AUTH === '1') {
    await signInWithClerkTicket(page, baseURL);
  } else {
    await page.goto('/en-US/sign-in');

    if (email) {
      // Attempt to prefill email for magic link flow.
      const emailField = page.getByLabel(/email/i);
      if (await emailField.count()) {
        await emailField.fill(email);
      }
    }

    console.log(
      'Manual authentication required: complete social login or magic link in the headed browser.',
    );
    console.log(`Waiting up to ${manualTimeout / 1000}s for Clerk session (__session cookie).`);

    const start = Date.now();
    let authenticated = false;
    while (Date.now() - start < manualTimeout) {
      const cookies = await page.context().cookies();
      if (cookies.some((c) => c.name.includes('__session'))) {
        authenticated = true;
        break;
      }
      await page.waitForTimeout(1000);
    }
    if (!authenticated) {
      throw new Error(
        'Manual authentication timed out. Increase MANUAL_AUTH_TIMEOUT_MS or ensure the social/magic link flow completed.',
      );
    }
  }

  await page.goto('/en-US/my-stories');
  await expect(page.getByRole('link', { name: 'New Story', exact: true })).toBeVisible();
  const profile = await page.request.get('/api/auth/me');
  expect(profile.ok()).toBe(true);
  expect(await profile.json()).toHaveProperty('authorId');

  await page.context().storageState({ path: authFile });
  console.log(`Stored authenticated state at ${authFile}`);
});
