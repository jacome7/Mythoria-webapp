import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { expect, test } from './support/fixtures';
import premium from '../../src/lib/premium-children-book/worker-manifest.fixture.json';

const storyId = '00000000-0000-4000-8000-000000000002';

test('loads the private reader and print pricing without null URL requests', async ({
  context,
  page,
}) => {
  test.skip(process.env.PLAYWRIGHT_CLERK_FIXTURE !== '1', 'Requires the disposable fixture.');
  const cdp = await context.newCDPSession(page);
  const nullRequests: string[] = [];
  await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent', ({ request, initiator }) => {
    const { pathname } = new URL(request.url);
    if (!/\/null\/?$/.test(pathname)) return;
    nullRequests.push(`${pathname} via ${initiator.stack?.callFrames[0]?.url ?? initiator.type}`);
  });

  await page.goto('/en-US');
  await page.addInitScript((id) => localStorage.setItem('currentStoryId', id), premium.storyId);
  await page.route(`**/api/my-stories/${premium.storyId}`, (route) =>
    route.fulfill({
      json: {
        story: {
          storyId: premium.storyId,
          title: 'Premium fixture in progress',
          status: 'writing',
          bookType: 'premium_children',
          storyGenerationStatus: 'running',
          storyGenerationCompletedPercentage: 5,
        },
      },
    }),
  );
  await page.goto('/en-US/tell-your-story/step-5');
  const myStories = page.getByRole('link', { name: 'Go to My Stories' });
  await expect(myStories).toHaveAttribute('href', '/en-US/my-stories');
  await myStories.click();
  await expect(page).toHaveURL(/\/en-US\/my-stories$/);

  await page.goto(`/en-US/stories/read/${storyId}`);
  await expect(page.getByRole('button', { name: '1. A new beginning' })).toBeVisible();
  await page.goto(`/en-US/stories/read/${storyId}/chapter/1`);
  await expect(
    page.getByText('This is a disposable browser fixture story.', { exact: false }),
  ).toBeVisible();

  const optionsPath = `/api/print-requests/options?storyId=${storyId}`;
  await page.route('**/api/addresses', (route) =>
    route.fulfill({
      json: {
        success: true,
        addresses: [
          {
            addressId: 'fixture-address',
            label: 'Fixture address',
            line1: '1 Fixture Road',
            city: 'Lisbon',
            postalCode: '1000-001',
            country: 'PT',
          },
        ],
      },
    }),
  );
  const printPage = `/en-US/stories/print/${storyId}`;
  await page.goto(printPage);
  await page.getByRole('button', { name: 'Continue' }).click();
  const options = page.waitForResponse((response) => response.url().endsWith(optionsPath));
  await page.getByRole('button', { name: 'Continue' }).click();
  expect((await options).status()).toBe(200);
  await expect(page.getByText('Softcover', { exact: false }).first()).toBeVisible();

  await context.clearCookies();
  const anonymousRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/print-requests/')) anonymousRequests.push(url.pathname);
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Access Restricted' })).toBeVisible();
  expect(anonymousRequests).toEqual([]);
  expect((await context.request.get(optionsPath)).status()).toBe(401);
  expect(nullRequests).toEqual([]);
});

test('uploads a full-size story input through Next.js and rejects a larger file', async ({
  page,
}) => {
  const storageDir = process.env.PLAYWRIGHT_PREMIUM_STORAGE_DIR;
  test.skip(
    !storageDir || process.env.PLAYWRIGHT_CLERK_FIXTURE !== '1',
    'Requires disposable storage.',
  );
  const maxBytes = 16 * 1024 * 1024;
  const bytes = Buffer.alloc(maxBytes, 0x61);
  bytes[maxBytes - 1] = 0x7a;
  const assetId = randomUUID();
  const headers = { 'content-type': 'audio/wav', 'x-media-kind': 'audio', 'x-media-id': assetId };
  const route = '/api/media/input-upload';
  const accepted = await page.request.post(route, { headers, data: bytes });
  expect(accepted.status()).toBe(200);
  const { objectPath, publicUrl } = await accepted.json();
  expect(publicUrl).toBe(`https://storage.googleapis.com/story-input-fixture/${objectPath}`);
  expect(objectPath).toMatch(new RegExp('/inputs/' + assetId + '[.]wav$'));
  const stored = await readFile(join(storageDir!, objectPath));
  expect(stored.equals(bytes)).toBe(true);

  const rejected = await page.request.post(route, { headers, data: Buffer.alloc(maxBytes + 1) });
  expect(rejected.status()).toBe(413);
  expect(await rejected.json()).toMatchObject({ code: 'file_too_large', maxBytes });
});
