import { test, expect, Page } from '@playwright/test';

// Core static routes (without dynamic segments) to verify for each locale.
const STATIC_ROUTES = [
  '', // home -> /{locale}
  'aboutUs',
  'contactUs',
  'pricing',
  'privacy-policy',
  'termsAndConditions',
  'get-inspired',
  'tell-your-story',
  'my-stories',
  'profile',
  'blog',
  'buy-credits',
];

const STORY_WIZARD_STEPS = [
  'tell-your-story/step-1',
  'tell-your-story/step-2',
  'tell-your-story/step-3',
  'tell-your-story/step-4',
  'tell-your-story/step-5',
];

const LOCALES = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'];

// Helper to scan page for missing translation markers: "__missing__" or patterns like {Some.Key}
async function assertNoMissingTranslations(page: Page) {
  const content = await page.content();
  const missingToken = /__missing__|\{[A-Za-z0-9_.-]+\}/g;
  const matches = content.match(missingToken) || [];
  // Filter out curly braces that belong to JSON-LD scripts (structured data) by requiring at least one dot inside
  const realMisses = matches.filter((m) => m.includes('.') || m.includes('__missing__'));
  expect(realMisses, `Missing translation tokens found: ${realMisses.join(', ')}`).toHaveLength(0);
}

async function gotoAndCheck(page: Page, urlPath: string) {
  const resp = await page.goto(urlPath, { waitUntil: 'domcontentloaded' });
  expect(
    resp?.ok(),
    `Failed to load ${urlPath}: ${resp?.status()} ${resp?.statusText()}`,
  ).toBeTruthy();
  await assertNoMissingTranslations(page);
  // Basic error absence checks
  const consoleErrors = page.locator('text=/error/i');
  // Allow some pages maybe containing the word 'Error' legitimately; soft assertion by counting large error banners
  const errorCount = await consoleErrors.count();
  expect(errorCount).toBeLessThan(3);
}

for (const locale of LOCALES) {
  test.describe(`Locale ${locale}`, () => {
    test.beforeEach(async ({ page }) => {
      // Set localStorage locale before first navigation to force locale (LanguageSwitcher uses this key)
      await page.addInitScript((loc: string) => {
        try {
          localStorage.setItem('mythoria-locale', loc);
        } catch {}
      }, locale);
    });

    test(`Navigate core static routes in ${locale}`, async ({ page }) => {
      for (const route of STATIC_ROUTES) {
        await gotoAndCheck(page, `/${locale}/${route}`.replace(/\/$/, ''));
      }
    });

    test(`Navigate story wizard steps in ${locale}`, async ({ page }) => {
      for (const route of STORY_WIZARD_STEPS) {
        await gotoAndCheck(page, `/${locale}/${route}`);
      }
    });
  });
}

// Separate test to verify LanguageSwitcher UI triggers navigation + persistence
// We'll only do this for English -> Portuguese to avoid repetition.

test('Language switcher changes locale and persists', async ({ page }) => {
  await page.goto('/en-US');
  // Open dropdown
  await page.getByRole('button', { name: /EN/i }).click();
  await page.getByRole('button', { name: /Português/ }).click();
  await page.waitForURL(/\/pt-PT/);
  await assertNoMissingTranslations(page);
  // Reload and ensure still on pt-PT due to localStorage persistence
  await page.reload();
  expect(page.url()).toContain('/pt-PT');
});
