import { test, expect, type Page } from '@playwright/test';

/**
 * Homepage hero composition tests.
 * Verifies that the paper-cut hero switches composition based on intent
 * (query param and cookie flows) and that all /homepage/ assets load without 404s.
 */

function collectHydrationErrors(page: Page): string[] {
  const hydrationErrors: string[] = [];

  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' && text.includes('Hydration failed')) {
      hydrationErrors.push(text);
    }
  });
  page.on('pageerror', (error) => {
    if (error.message.includes('Hydration failed')) {
      hydrationErrors.push(error.message);
    }
  });

  return hydrationErrors;
}

test.describe('Homepage hero — default composition', () => {
  test('renders kids_fantasy headline without ?intent param', async ({ page }) => {
    await page.goto('/en-US', { waitUntil: 'domcontentloaded' });

    // The kids_fantasy headline key resolves to text containing "story"
    const hero = page.locator('section.papercut-hero');
    await expect(hero).toBeVisible();

    const h1 = hero.locator('h1');
    await expect(h1).toBeVisible();
    // Default composition headline should not contain sports-specific copy
    await expect(h1).not.toContainText('team', { ignoreCase: true });
  });

  test('no /homepage/ asset returns 404 on default homepage', async ({ page }) => {
    const failed: string[] = [];
    page.on('response', (resp) => {
      if (resp.url().includes('/homepage/') && resp.status() === 404) {
        failed.push(`${resp.status()} ${resp.url()}`);
      }
    });
    await page.goto('/en-US', { waitUntil: 'networkidle' });
    expect(failed, `404s on homepage assets:\n${failed.join('\n')}`).toHaveLength(0);
  });
});

test.describe('Homepage hero — sports_teams via ?intent= query param', () => {
  test('renders sports_teams headline from query intent', async ({ page }) => {
    await page.goto('/en-US?intent=sports_teams', { waitUntil: 'domcontentloaded' });

    const h1 = page.locator('section.papercut-hero h1');
    await expect(h1).toBeVisible();

    // Query intent has precedence over the default composition.
    await expect(h1).toContainText('team', { ignoreCase: true });
  });

  test('no /homepage/ asset returns 404 with ?intent=sports_teams', async ({ page }) => {
    const failed: string[] = [];
    page.on('response', (resp) => {
      if (resp.url().includes('/homepage/') && resp.status() === 404) {
        failed.push(`${resp.status()} ${resp.url()}`);
      }
    });
    await page.goto('/en-US?intent=sports_teams', { waitUntil: 'networkidle' });
    expect(failed, `404s on homepage assets:\n${failed.join('\n')}`).toHaveLength(0);
  });

  test('unknown intent falls back to default composition', async ({ page }) => {
    await page.goto('/en-US?intent=bogus_unknown_intent', { waitUntil: 'domcontentloaded' });
    const hero = page.locator('section.papercut-hero');
    await expect(hero).toBeVisible();
    // Should not crash; h1 must exist
    await expect(hero.locator('h1')).toBeVisible();
  });
});

test.describe('Homepage hero — sports_teams via /i/ cookie flow', () => {
  test('sets intent cookie and shows sports hero on redirect', async ({ page }) => {
    // /i/sports_teams sets the cookie and redirects to the localized homepage
    await page.goto('/i/sports_teams', { waitUntil: 'networkidle' });

    // Confirm we landed on a homepage (not the /i/ route)
    expect(page.url()).not.toContain('/i/');

    const h1 = page.locator('section.papercut-hero h1');
    await expect(h1).toBeVisible();

    // The cookie drives composition selection server-side and client-side
    await expect(h1).toContainText('team', { ignoreCase: true });

    // Confirm the cookie was set
    const cookies = await page.context().cookies();
    const intentCookie = cookies.find((c) => c.name === 'mythoria_intent_context');
    expect(intentCookie).toBeDefined();
    expect(intentCookie?.value).toContain('sports_teams');
  });

  test('clearing intent cookie reverts to default composition', async ({ page }) => {
    // First set the cookie via /i/
    await page.goto('/i/sports_teams', { waitUntil: 'networkidle' });

    // Clear the cookie
    await page.context().clearCookies();

    // Navigate fresh
    await page.goto('/en-US', { waitUntil: 'domcontentloaded' });
    const h1 = page.locator('section.papercut-hero h1');
    await expect(h1).toBeVisible();
    // Default composition should not say "team"
    await expect(h1).not.toContainText('team', { ignoreCase: true });
  });
});

test.describe('Homepage hero — grandparents intent', () => {
  test('switches to grandparents headline with ?intent=grandparents', async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);
    await page.goto('/en-US?intent=grandparents', { waitUntil: 'domcontentloaded' });

    const h1 = page.locator('section.papercut-hero h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('Grandparents', { ignoreCase: true });
    expect(hydrationErrors).toEqual([]);
  });

  test('no /homepage/ asset returns 404 with ?intent=grandparents', async ({ page }) => {
    const failed: string[] = [];
    page.on('response', (resp) => {
      if (resp.url().includes('/homepage/') && resp.status() === 404) {
        failed.push(`${resp.status()} ${resp.url()}`);
      }
    });
    await page.goto('/en-US?intent=grandparents', { waitUntil: 'networkidle' });
    expect(failed, `404s on homepage assets:\n${failed.join('\n')}`).toHaveLength(0);
  });

  test('sets intent cookie and shows grandparents hero on redirect', async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);
    await page.goto('/i/grandparents', { waitUntil: 'networkidle' });

    expect(page.url()).not.toContain('/i/');

    const h1 = page.locator('section.papercut-hero h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('Grandparents', { ignoreCase: true });

    const cookies = await page.context().cookies();
    const intentCookie = cookies.find((c) => c.name === 'mythoria_intent_context');
    expect(intentCookie).toBeDefined();
    expect(intentCookie?.value).toContain('grandparents');
    expect(hydrationErrors).toEqual([]);
  });
});

test.describe('Homepage hero — landing page intent handoff', () => {
  test('grandparents landing page sets homepage intent cookie', async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);

    await page.goto('/pt-PT/lp/livro-personalizado-avos-netos', {
      waitUntil: 'domcontentloaded',
    });

    const cookies = await page.context().cookies();
    const intentCookie = cookies.find((c) => c.name === 'mythoria_intent_context');
    expect(intentCookie).toBeDefined();
    expect(decodeURIComponent(intentCookie?.value ?? '')).toContain('grandparents');

    await page.goto('/pt-PT', { waitUntil: 'domcontentloaded' });

    const h1 = page.locator('section.papercut-hero h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('avós', { ignoreCase: true });
    expect(hydrationErrors).toEqual([]);
  });
});

test.describe('Homepage hero — PT-PT campaign URLs', () => {
  for (const campaign of [
    {
      intent: 'romance',
      headline: 'A vossa história, eternizada.',
      clickKey: 'gclid',
      clickValue: 'google-click-1',
    },
    {
      intent: 'grandparents',
      headline: 'As histórias dos avós, eternizadas.',
      clickKey: 'wbraid',
      clickValue: 'google-click-2',
    },
  ]) {
    test(`${campaign.intent} is a direct 200 with persistent context and attribution`, async ({
      page,
      context,
    }) => {
      const attributionPayloads: Array<Record<string, unknown>> = [];
      await context.addCookies([
        {
          name: 'mythoria_consent',
          value: encodeURIComponent(
            JSON.stringify({
              state: {
                analytics_storage: 'granted',
                ad_storage: 'granted',
                ad_user_data: 'granted',
                ad_personalization: 'granted',
              },
              timestamp: Date.now(),
            }),
          ),
          url: 'http://localhost:3000',
          sameSite: 'Lax',
        },
      ]);
      await page.addInitScript(() => {
        window.gtag = (...args: unknown[]) => {
          if (args[0] !== 'get') return;
          const callback = args[3] as (value: unknown) => void;
          callback(args[2] === 'client_id' ? '123.456' : '1712345678');
        };
      });
      await page.route('**/api/analytics/attribution', async (route) => {
        attributionPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ captured: true }),
        });
      });
      await page.route('**/api/analytics/attribution/link', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      });

      const campaignUrl = `/pt-PT?intent=${campaign.intent}&utm_source=google&utm_medium=cpc&utm_campaign=cluster-test&${campaign.clickKey}=${campaign.clickValue}`;
      const directResponse = await page.request.get(campaignUrl, { maxRedirects: 0 });
      expect(directResponse.status()).toBe(200);
      expect(directResponse.headers().location).toBeUndefined();
      const response = await page.goto(campaignUrl, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      const finalUrl = new URL(page.url());
      expect(finalUrl.pathname).toBe('/pt-PT');
      expect(Object.fromEntries(finalUrl.searchParams)).toMatchObject({
        intent: campaign.intent,
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'cluster-test',
        [campaign.clickKey]: campaign.clickValue,
      });
      await expect(page.locator('section.papercut-hero h1')).toContainText(campaign.headline);

      const intentCookie = (await context.cookies()).find(
        (cookie) => cookie.name === 'mythoria_intent_context',
      );
      expect(decodeURIComponent(intentCookie?.value ?? '')).toContain(campaign.intent);

      await expect.poll(() => attributionPayloads.length).toBe(1);
      expect(attributionPayloads[0]).toMatchObject({
        landingSlug: 'homepage',
        primaryIntent: campaign.intent,
        campaign: {
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'cluster-test',
          [campaign.clickKey]: campaign.clickValue,
        },
      });

      await page.goto('/pt-PT', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('section.papercut-hero h1')).toContainText(campaign.headline);
    });
  }
});
