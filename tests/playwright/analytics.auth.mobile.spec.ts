import { createClerkClient } from '@clerk/backend';
import { devices, expect, test } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

test.use({ ...devices['Pixel 7'] });
test.describe.configure({ mode: 'serial' });

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const e2eEmail = process.env.CLERK_E2E_EMAIL;

test.skip(!clerkSecretKey || !e2eEmail, 'Clerk E2E credentials are required.');

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

async function authenticateWithTestUser(page: import('@playwright/test').Page) {
  const clerk = createClerkClient({ secretKey: clerkSecretKey! });
  const users = await clerk.users.getUserList({ emailAddress: [e2eEmail!] });
  const user =
    users.data[0] ||
    (await clerk.users.createUser({
      emailAddress: [e2eEmail!],
      firstName: 'Analytics',
      lastName: 'E2E',
      skipPasswordRequirement: true,
      skipLegalChecks: true,
    }));
  const ticket = await clerk.signInTokens.createSignInToken({
    userId: user.id,
    expiresInSeconds: 300,
  });

  await page.context().clearCookies();
  await page.goto('/en-US/sign-in', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    Boolean((window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded),
  );
  await page.evaluate(async (token) => {
    const clerk = (
      window as unknown as {
        Clerk: {
          client: {
            signIn: {
              create: (params: { strategy: 'ticket'; ticket: string }) => Promise<{
                status: string;
                createdSessionId?: string | null;
              }>;
            };
          };
          setActive: (params: { session: string }) => Promise<void>;
        };
      }
    ).Clerk;
    const signIn = await clerk.client.signIn.create({ strategy: 'ticket', ticket: token });
    if (signIn.status !== 'complete' || !signIn.createdSessionId) {
      throw new Error(`Ticket sign-in did not complete: ${signIn.status}`);
    }
    await clerk.setActive({ session: signIn.createdSessionId });
  }, ticket.token);
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

test('authenticated mobile step emits one sanitized start and view', async ({ page }) => {
  await installAnalyticsCapture(page);
  await authenticateWithTestUser(page);

  const authResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/auth/me') && response.status() === 200,
  );
  await page.goto(
    '/en-US/tell-your-story/step-1?utm_campaign=analytics-e2e&token=secret&email=child%40example.com',
    { waitUntil: 'domcontentloaded' },
  );
  await authResponse;
  await expect(page.locator('input[required]')).toBeVisible();
  await page.waitForFunction(() =>
    (window as unknown as { __analyticsEvents: unknown[][] }).__analyticsEvents.some(
      (entry) => entry[1] === 'story_step_viewed',
    ),
  );

  const events = await page.evaluate(
    () => (window as unknown as { __analyticsEvents: unknown[][] }).__analyticsEvents,
  );
  const starts = events.filter((entry) => entry[1] === 'story_creation_started');
  const views = events.filter((entry) => entry[1] === 'story_step_viewed');
  const pageViews = events.filter((entry) => entry[1] === 'page_view');

  expect(starts).toHaveLength(1);
  expect(views).toHaveLength(1);
  expect(views[0][2]).toMatchObject({ step_number: 1 });
  expect(JSON.stringify([...starts, ...views, ...pageViews])).not.toMatch(
    /secret|child@example\.com|token=/i,
  );
  expect(JSON.stringify(pageViews)).toContain('utm_campaign=analytics-e2e');
});
