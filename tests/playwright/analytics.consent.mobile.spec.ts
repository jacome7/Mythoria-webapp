import { devices, expect, test, type Page } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });
test.describe.configure({ mode: 'serial' });

type GtagCommand = [string, ...unknown[]];

async function installGtagCapture(page: Page): Promise<void> {
  await page.route(/https:\/\/www\.googletagmanager\.com\/.*/, (route) => route.abort());
  await page.route(/https:\/\/www\.google-analytics\.com\/.*/, (route) => route.abort());
  await page.addInitScript(() => {
    const commands: unknown[][] = [];
    const dataLayer: unknown[] = [];
    const nativePush = Array.prototype.push;
    dataLayer.push = (...items: unknown[]) => {
      for (const item of items) commands.push(Array.from(item as ArrayLike<unknown>));
      return nativePush.apply(dataLayer, items);
    };
    Object.assign(window, { dataLayer, __gtagCommands: commands });
  });
}

async function readCommands(page: Page): Promise<GtagCommand[]> {
  return page.evaluate(
    () => (window as unknown as { __gtagCommands: GtagCommand[] }).__gtagCommands,
  );
}

function consentCommands(commands: GtagCommand[], operation: 'default' | 'update') {
  return commands.filter((command) => command[0] === 'consent' && command[1] === operation);
}

function pageViewCommands(commands: GtagCommand[]) {
  return commands.filter((command) => command[0] === 'event' && command[1] === 'page_view');
}

test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();
  await installGtagCapture(page);
});

test('analytics-only keeps advertising denied and query cleanup emits one page_view', async ({
  page,
}) => {
  await page.goto('/pt-PT?utm_source=google&utm_campaign=consent-e2e&gclid=redacted-test-id', {
    waitUntil: 'domcontentloaded',
  });

  await page.getByRole('button', { name: /só análise|analytics only/i }).click();
  await expect(page).not.toHaveURL(/gclid|utm_campaign/);

  const commands = await readCommands(page);
  expect(consentCommands(commands, 'default')).toEqual([
    [
      'consent',
      'default',
      expect.objectContaining({
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      }),
    ],
  ]);
  expect(consentCommands(commands, 'update')).toContainEqual([
    'consent',
    'update',
    expect.objectContaining({
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    }),
  ]);
  expect(pageViewCommands(commands)).toHaveLength(1);
});

test('stored consent is replayed as update after a denied default on reload', async ({ page }) => {
  await page.goto('/pt-PT', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /aceitar tudo|accept all/i }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });

  const commands = await readCommands(page);
  const deniedDefault = consentCommands(commands, 'default')[0];
  const storedUpdate = consentCommands(commands, 'update')[0];
  expect(deniedDefault?.[2]).toMatchObject({
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  expect(storedUpdate?.[2]).toMatchObject({
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  });
  expect(commands.indexOf(deniedDefault)).toBeLessThan(commands.indexOf(storedUpdate));
  expect(pageViewCommands(commands)).toHaveLength(1);
});

test('reject all leaves every optional storage signal denied', async ({ page }) => {
  await page.goto('/pt-PT', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /rejeitar tudo|reject all/i }).click();

  const updates = consentCommands(await readCommands(page), 'update');
  expect(updates).toContainEqual([
    'consent',
    'update',
    expect.objectContaining({
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    }),
  ]);
});
