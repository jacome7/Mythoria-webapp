import { devices, expect, test } from './support/fixtures';
import { config } from 'dotenv';
import { signInWithClerkTicket } from './support/sign-in';

config({ path: '.env.local', quiet: true });

test.use({ ...devices['Pixel 7'] });
test.describe.configure({ mode: 'serial' });

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const e2eEmail = process.env.CLERK_E2E_EMAIL;

test.skip(
  process.env.PLAYWRIGHT_CLERK_FIXTURE !== '1' || !clerkSecretKey || !e2eEmail,
  'Requires the isolated synthetic Clerk and database fixture.',
);

async function installAnalyticsCapture(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const events: unknown[][] = [];
    const dataLayer: unknown[] = [];
    const nativePush = Array.prototype.push;
    dataLayer.push = (...items: unknown[]) => {
      for (const item of items) {
        const args = Array.from(item as ArrayLike<unknown>);
        if (args[0] === 'event') events.push(args);
      }
      return nativePush.apply(dataLayer, items);
    };
    Object.assign(window, { dataLayer, __analyticsEvents: events });
  });
}

async function grantAnalyticsConsent(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const consent = {
      version: 2,
      state: {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
      timestamp: Date.now(),
      preferences: { analytics: true, advertising: false },
    };
    document.cookie = `mythoria_consent=${encodeURIComponent(JSON.stringify(consent))}; path=/; SameSite=Lax`;
  });
}

test('signed-out auth gate emits no story start', async ({ page }) => {
  await page.context().clearCookies();
  await installAnalyticsCapture(page);
  await page.goto('/en-US/tell-your-story/step-1', { waitUntil: 'networkidle' });

  await expect(page.getByRole('link', { name: /sign in/i }).last()).toBeVisible();
  const events = await page.evaluate(
    () => (window as unknown as { __analyticsEvents: unknown[][] }).__analyticsEvents,
  );
  expect(events.filter((entry) => entry[1] === 'story_creation_started')).toHaveLength(0);
});

test('authenticated mobile creation keeps the story and synthetic identity out of the tag queue', async ({
  page,
  baseURL,
}) => {
  await installAnalyticsCapture(page);
  await signInWithClerkTicket(page, baseURL);
  await grantAnalyticsConsent(page);

  const authResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/auth/me') && response.status() === 200,
  );
  await page.goto(
    '/en-US/tell-your-story/step-1?utm_campaign=analytics-e2e&token=secret&email=child%40example.com',
    { waitUntil: 'domcontentloaded' },
  );
  await authResponse;
  await expect(page.locator('input[required]')).toBeVisible();
  const events = await page.evaluate(
    () => (window as unknown as { __analyticsEvents: unknown[][] }).__analyticsEvents,
  );
  const starts = events.filter((entry) => entry[1] === 'story_creation_started');
  const views = events.filter((entry) => entry[1] === 'story_step_viewed');
  const pageViews = events.filter((entry) => entry[1] === 'page_view');

  expect([...starts, ...views, ...pageViews]).toEqual([]);
});
