import { test, expect, Page } from '@playwright/test';

/**
 * Extended i18n navigation + translation integrity tests.
 * This suite attempts to visit a wide coverage of application routes across locales
 * and assert that no obvious missing translation tokens appear.
 */

const LOCALES = ['en-US', 'pt-PT', 'es-ES', 'fr-FR'];

// Static (non-auth) base routes (avoid dynamic segments needing data or auth) 
const STATIC_ROUTES = [
  '', // home
  'aboutUs',
  'contactUs',
  'pricing',
  'privacy-policy',
  'privacy-policy/delete-account',
  'termsAndConditions',
  'get-inspired',
  'tell-your-story',
  'my-stories',
  'blog',
  'buy-credits'
];

// Only include step-1; later steps appear to require prior state (story context) leading to aborted requests.
const STORY_WIZARD_STEPS = [
  'tell-your-story/step-1'
];

// Dynamic sample routes (provide representative slugs that exist in seed/content shown on homepage snapshot).
// These must remain in sync with marketing examples or adjust if content changes.
const SAMPLE_DYNAMIC = [
  'p/mateus-e-o-leo',
  'p/how-i-met-your-mother'
];

// Helper: detect explicit missing translation markers only to avoid false positives from module names.
async function assertNoMissingTranslations(page: Page, contextLabel: string) {
  const html = await page.content();
  const explicit = html.match(/__missing__/g) || [];
  expect(explicit, `Missing translation markers on ${contextLabel}: ${explicit.join(', ')}`).toHaveLength(0);
}

async function gotoAndCheck(page: Page, fullPath: string) {
  const resp = await page.goto(fullPath, { waitUntil: 'domcontentloaded' });
  expect(resp && resp.ok(), `Failed to load ${fullPath} -> status ${resp?.status()}`).toBeTruthy();
  await assertNoMissingTranslations(page, fullPath);
  // Ensure no obvious error boundaries or unhandled error messages
  const errorLike = await page.locator('text=/error/i').count();
  expect(errorLike).toBeLessThan(2);
}

for (const locale of LOCALES) {
  test.describe(`i18n coverage for ${locale}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(l => localStorage.setItem('mythoria-locale', l), locale);
    });

    test(`static pages (${locale})`, async ({ page }) => {
      for (const r of STATIC_ROUTES) {
        await gotoAndCheck(page, `/${locale}/${r}`.replace(/\/$/, ''));
      }
    });

    test(`story wizard steps (${locale})`, async ({ page }) => {
      for (const step of STORY_WIZARD_STEPS) {
        await gotoAndCheck(page, `/${locale}/${step}`);
      }
    });

    test(`sample dynamic content (${locale})`, async ({ page }) => {
      for (const dyn of SAMPLE_DYNAMIC) {
        await gotoAndCheck(page, `/${locale}/${dyn}`);
      }
    });
  });
}