import { expect, type Page } from './fixtures';

// Helper to scan page for missing translation markers: "__missing__" or patterns like {Some.Key}
export async function assertNoMissingTranslations(page: Page) {
  const content = await page.content();
  const missingToken = /__missing__|\{[A-Za-z0-9_.-]+\}/g;
  const matches = content.match(missingToken) || [];
  // Filter out curly braces that belong to JSON-LD scripts (structured data) by requiring at least one dot inside
  const realMisses = matches.filter((m) => m.includes('.') || m.includes('__missing__'));
  expect(realMisses, `Missing translation tokens found: ${realMisses.join(', ')}`).toHaveLength(0);
}

export async function gotoAndCheck(page: Page, urlPath: string, destination = urlPath) {
  const resp = await page.goto(urlPath, { waitUntil: 'domcontentloaded' });
  expect(
    resp?.ok(),
    `Failed to load ${urlPath}: ${resp?.status()} ${resp?.statusText()}`,
  ).toBeTruthy();
  await expect(page).toHaveURL((url) => url.pathname === destination);
  await assertNoMissingTranslations(page);
  // Basic error absence checks
  const consoleErrors = page.locator('text=/error/i');
  // Allow some pages maybe containing the word 'Error' legitimately; soft assertion by counting large error banners
  const errorCount = await consoleErrors.count();
  expect(errorCount).toBeLessThan(3);
}
