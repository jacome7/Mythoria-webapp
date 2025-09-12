import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Auth storage state (gitignored)
const authFile = 'tests/playwright/.auth/user.json';

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
      console.log(`Existing auth state age: ${ageH}h (< ${maxAgeHours}h). Skipping manual auth setup. Set REFRESH_AUTH=1 to force refresh.`);
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

// This setup supports ONLY social login or magic link (no password path).
// Timeout can be adjusted with MANUAL_AUTH_TIMEOUT_MS (default 180000 ms).
setup('authenticate (manual social or magic link only)', async ({ page }) => {
  const email = process.env.CLERK_E2E_EMAIL; // optional prefill for magic link
  const manualTimeout = Number(process.env.MANUAL_AUTH_TIMEOUT_MS || 180000);

  ensureDir(authFile);

  await page.goto('/en-US/sign-in');

  if (email) {
    // Attempt to prefill email for magic link flow.
    const emailField = page.getByLabel(/email/i);
    if (await emailField.count()) {
      await emailField.fill(email);
    }
  }

  console.log('Manual authentication required: complete social login or magic link in the headed browser.');
  console.log(`Waiting up to ${manualTimeout / 1000}s for Clerk session (__session cookie).`);

  const start = Date.now();
  let authenticated = false;
  while (Date.now() - start < manualTimeout) {
    const cookies = await page.context().cookies();
    if (cookies.some(c => c.name.includes('__session'))) {
      authenticated = true;
      break;
    }
    await page.waitForTimeout(1000);
  }
  if (!authenticated) {
    throw new Error('Manual authentication timed out. Increase MANUAL_AUTH_TIMEOUT_MS or ensure the social/magic link flow completed.');
  }

  await page.goto('/en-US/my-stories');
  const signInLink = page.getByRole('link', { name: /sign in/i });
  expect(await signInLink.isVisible()).toBeFalsy();

  await page.context().storageState({ path: authFile });
  console.log(`Stored authenticated state at ${authFile}`);
});
