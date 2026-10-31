import { expect, test } from '@playwright/test';

/**
 * Anonymous survey respondent smoke tests.
 *
 * Skipped unless E2E_SURVEY_TOKEN is set to a valid, unsubmitted invitation token of an active
 * study (use a dedicated test invitation, never a real customer's). Run with:
 *   SKIP_AUTH_SETUP=1 E2E_SURVEY_TOKEN=<token> npx playwright test tests/playwright/survey.anonymous.spec.ts
 * The test only opens the survey and walks the intro; it never submits, so the invitation can be
 * reused.
 */
const token = process.env.E2E_SURVEY_TOKEN;

test.describe('anonymous survey respondent flow', () => {
  test.skip(!token, 'E2E_SURVEY_TOKEN is not set');

  for (const viewport of [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1440, height: 900 },
  ]) {
    test(`opens the survey without login on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(`/en-US/survey/${token}`, { waitUntil: 'domcontentloaded' });
      expect(response?.ok()).toBe(true);
      await page.waitForLoadState('networkidle');

      const rejectCookies = page.getByRole('button', { name: /reject all/i });
      if (await rejectCookies.isVisible()) await rejectCookies.click();

      await expect(page).not.toHaveURL(/sign-in/);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('link', { name: /privacy policy/i })).toHaveAttribute(
        'href',
        '/en-US/privacy-policy',
      );

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      await page.getByRole('button', { name: /let's begin|pick up where you left off/i }).click();
      await expect(page.getByRole('progressbar', { name: /survey progress/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^(next|send my answers)/i })).toBeVisible();
    });
  }

  test('shows the friendly invalid-link page for a forged token', async ({ page }) => {
    const response = await page.goto('/en-US/survey/not-a-real-token.AAAAAAAAAAAAAAAAAAAAAA', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading', { name: /doesn't open a survey/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to mythoria/i })).toBeVisible();
  });
});
