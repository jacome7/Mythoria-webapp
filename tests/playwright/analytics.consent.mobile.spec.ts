import { devices, expect, test, type Page } from './support/fixtures';

test.use({ ...devices['Pixel 7'] });
test.describe.configure({ mode: 'serial' });
test.skip(
  process.env.PLAYWRIGHT_CLERK_FIXTURE !== '1',
  'Requires the isolated browser and database fixture.',
);

function collectTagRequests(page: Page): string[] {
  const payloads: string[] = [];
  page.on('request', (request) => {
    const { hostname } = new URL(request.url());
    if (
      /(^|\.)(google-analytics\.com|googletagmanager\.com|googleadservices\.com|doubleclick\.net)$/.test(
        hostname,
      ) ||
      ['bzr.openai.com', 'bzrcdn.openai.com'].includes(hostname)
    ) {
      payloads.push(request.url(), request.postData() || '', request.headers().referer || '');
    }
  });
  return payloads;
}

test('records no optional destination request through signup, encoded return, and consent changes', async ({
  page,
  context,
}) => {
  const tagPayloads = collectTagRequests(page);
  const sentinel = 'private-fixture-sentinel';
  await context.clearCookies();
  const response = await page.goto(
    `/pt-PT?gclid=${sentinel}&utm_content=${encodeURIComponent(`/pt-PT/s/${sentinel}`)}`,
  );
  expect(response?.headers()['referrer-policy']).toBe('no-referrer');
  await expect(page.getByRole('button', { name: /só análise|analytics only/i })).toBeVisible();
  expect(
    (await context.cookies()).find(({ name }) => name === 'mythoria_attribution'),
  ).toBeUndefined();

  const capture = page.waitForResponse(
    (value) => value.url().endsWith('/api/analytics/attribution') && value.ok(),
  );
  await page.getByRole('button', { name: /só análise|analytics only/i }).click();
  expect((await capture).request().postData() || '').not.toContain(sentinel);
  expect(
    (await context.cookies()).find(({ name }) => name === 'mythoria_attribution'),
  ).toMatchObject({
    httpOnly: true,
  });
  await page.goto(
    `/pt-PT/sign-in?redirect_url=${encodeURIComponent(`/pt-PT/s/${sentinel}?next=${sentinel}`)}`,
    { waitUntil: 'domcontentloaded' },
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/pt-PT/);
  expect(tagPayloads).toEqual([]);
});
