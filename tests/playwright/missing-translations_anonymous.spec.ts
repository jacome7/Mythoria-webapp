import { test, expect, Page } from '@playwright/test';
// Instrumented detection constants must match ClientProvider
const FALLBACK_PREFIX = '__MISSING__:'; // Keep in sync with I18N_FALLBACK_PREFIX
const MISSING_LOG_TAG = '[i18n-missing]';

/**
 * Extended i18n navigation + translation integrity tests.
 * This suite attempts to visit a wide coverage of application routes across locales
 * and assert that no obvious missing translation tokens appear.
 */

const LOCALES = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'];

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
  'blog',
];

// Dynamic sample routes (provide representative slugs that exist in seed/content shown on homepage snapshot).
// These must remain in sync with marketing examples or adjust if content changes.
const SAMPLE_DYNAMIC = ['p/mateus-e-o-leo', 'p/how-i-met-your-mother'];

// Helper: detect explicit missing translation markers only to avoid false positives from module names.
async function assertNoMissingTranslations(page: Page, contextLabel: string) {
  const html = await page.content();
  // New deterministic sentinel from getMessageFallback
  const sentinelRegex = new RegExp(`${FALLBACK_PREFIX}[A-Za-z0-9_.-]+`, 'g');
  const matches = html.match(sentinelRegex) || [];
  expect(
    matches,
    `Missing translations rendered on ${contextLabel}: ${matches.join(', ')}`,
  ).toHaveLength(0);
  // Also legacy pattern (temporary) in case provider not applied everywhere yet
  const legacy = html.match(/__missing__/g) || [];
  expect(legacy, `Legacy missing markers on ${contextLabel}: ${legacy.join(', ')}`).toHaveLength(0);
}

async function collectMissingLogs(page: Page) {
  return await page.evaluate(
    () => (window as unknown as { __i18nMissingLogs?: string[] }).__i18nMissingLogs || [],
  );
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
      await page.addInitScript(
        ({ l, tag }: { l: string; tag: string }) => {
          try {
            localStorage.setItem('mythoria-locale', l);
          } catch {}
          (window as unknown as { __i18nMissingLogs: string[] }).__i18nMissingLogs = [] as string[];
          const origWarn = window.console.warn;
          window.console.warn = (...args: unknown[]) => {
            if (args.length && typeof args[0] === 'string' && args[0].startsWith(tag)) {
              try {
                (window as unknown as { __i18nMissingLogs: string[] }).__i18nMissingLogs.push(
                  args[0] as string,
                );
              } catch {}
            }
            return origWarn(...(args as [unknown]));
          };
        },
        { l: locale, tag: MISSING_LOG_TAG },
      );
    });

    test(`static pages (${locale})`, async ({ page }) => {
      for (const r of STATIC_ROUTES) {
        await gotoAndCheck(page, `/${locale}/${r}`.replace(/\/$/, ''));
      }
      const logs = await collectMissingLogs(page);
      expect(
        logs,
        `Missing translation console logs (static pages ${locale}):\n${logs.join('\n')}`,
      ).toHaveLength(0);
    });

    test(`sample dynamic content (${locale})`, async ({ page }) => {
      for (const dyn of SAMPLE_DYNAMIC) {
        await gotoAndCheck(page, `/${locale}/${dyn}`);
      }
      const logs = await collectMissingLogs(page);
      expect(
        logs,
        `Missing translation console logs (dynamic content ${locale}):\n${logs.join('\n')}`,
      ).toHaveLength(0);
    });
  });
}
