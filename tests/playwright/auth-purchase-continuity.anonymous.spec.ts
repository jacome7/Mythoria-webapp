import { expect, test, type Page } from '@playwright/test';

// Run with SKIP_AUTH_SETUP=1 and a local server. Never uses the saved authenticated state.
test.use({
  viewport: { width: 402, height: 874 },
  storageState: { cookies: [], origins: [] },
  serviceWorkers: 'block',
});
test.describe.configure({ mode: 'serial' });

const romances = [
  ['pt-PT', 'livro-personalizado-para-casais'],
  ['en-US', 'personalized-book-for-couples'],
  ['es-ES', 'libro-personalizado-para-parejas'],
  ['fr-FR', 'livre-personnalise-pour-couples'],
] as const;
const locales = ['pt-PT', 'en-US', 'es-ES', 'fr-FR', 'de-DE'];

async function installReadOnlyRoutes(page: Page) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      await route.fulfill({ status: 204 });
      return;
    }
    if (/google-analytics\.com|googletagmanager\.com|doubleclick\.net/.test(url.hostname)) {
      await route.abort();
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      const body =
        url.pathname === '/api/pricing/credit-packages'
          ? {
              success: true,
              packages: [
                {
                  id: 2,
                  key: 'ten',
                  credits: 10,
                  price: 9,
                  icon: 'FaShoppingCart',
                  dbId: 'fixture-only',
                },
              ],
            }
          : { success: true, data: [], faqs: [], items: [], credits: 0 };
      await route.fulfill({ status: 200, json: body });
      return;
    }
    await route.continue();
  });
}

async function dismissConsent(page: Page) {
  const button = page
    .getByRole('button', {
      name: /recusar opcionais|reject optional|rechazar opcionales|refuser les optionnels|optionale.*ablehnen|alle ablehnen|rejeitar todos/i,
    })
    .first();
  if (await button.isVisible()) await button.click();
}

test.beforeEach(async ({ page, baseURL }) => {
  if (!baseURL || !['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) {
    throw new Error(
      'Continuity smoke requires a local server; live origins are deliberately rejected.',
    );
  }
  await installReadOnlyRoutes(page);
});

for (const [locale, slug] of romances) {
  test(`${locale}: mobile landing goes straight to signup with story context`, async ({ page }) => {
    await page.goto(`/${locale}/lp/${slug}?utm_source=fixture&ref=fixture-partner`, {
      waitUntil: 'domcontentloaded',
    });
    const primary = page.locator('[data-cta-placement="hero_primary"]');
    await expect(primary).toHaveAttribute('href', new RegExp(`^/${locale}/sign-up\\?redirect=`), {
      timeout: 30000,
    });
    const destination = new URL((await primary.getAttribute('href'))!, page.url());
    const returned = new URL(destination.searchParams.get('redirect')!, page.url());
    expect(returned.pathname).toBe(`/${locale}/tell-your-story/step-1`);
    expect(returned.searchParams.get('landingSlug')).toBe(slug);
    expect(returned.searchParams.get('primaryIntent')).toBe('romance');
    expect(returned.searchParams.get('ref')).toBe('fixture-partner');
    await expect(page.locator('[data-cta-placement="final_primary"]')).toHaveAttribute(
      'href',
      destination.pathname + destination.search,
    );
    await dismissConsent(page);
    await primary.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/sign-up\\?`));
    await expect(page.locator('body')).not.toContainText('Ups!');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
  });
}

for (const locale of locales) {
  test(`${locale}: mobile purchase retains its package through auth entry`, async ({ page }) => {
    await page.goto(`/${locale}/buy-credits?package=2`, { waitUntil: 'domcontentloaded' });
    const signup = page.locator(`a[href^="/${locale}/sign-up?redirect="]`);
    await expect(signup).toBeVisible({ timeout: 30000 });
    const entry = new URL((await signup.getAttribute('href'))!, page.url());
    expect(entry.searchParams.get('redirect')).toBe(`/${locale}/buy-credits?package=2`);
    const signin = page.locator(`a[href^="/${locale}/sign-in?redirect="]`);
    expect(
      new URL((await signin.getAttribute('href'))!, page.url()).searchParams.get('redirect'),
    ).toBe(`/${locale}/buy-credits?package=2`);
    await dismissConsent(page);
    await signup.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/sign-up\\?`));
    expect(new URL(page.url()).searchParams.get('redirect')).toBe(
      `/${locale}/buy-credits?package=2`,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
  });
}
