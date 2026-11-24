import { expect, test } from './support/fixtures';
import { assertNoMissingTranslations, gotoAndCheck } from './support/navigation';

// Core static routes (without dynamic segments) to verify for each locale.
const STATIC_ROUTES = [
  '', // home -> /{locale}
  'aboutUs',
  'contactUs',
  'pricing',
  'privacy-policy',
  'termsAndConditions',
  'get-inspired',
  'blog',
];

const LOCALES = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'];

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
  });
}

// Separate test to verify LanguageSwitcher UI triggers navigation + persistence
// We'll only do this for English -> Portuguese to avoid repetition.

test('Language switcher changes locale and persists', async ({ page }) => {
  await page.goto('/en-US');
  // Open dropdown
  await page.getByRole('button', { name: /^Language selector: EN$/ }).click();
  await page.getByRole('button', { name: 'Português PT', exact: true }).click();
  await page.waitForURL(/\/pt-PT/);
  await assertNoMissingTranslations(page);
  // Reload and ensure still on pt-PT due to localStorage persistence
  await page.reload();
  expect(page.url()).toContain('/pt-PT');
});
