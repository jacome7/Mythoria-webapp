import { devices, expect, test } from './support/fixtures';

test.use({ ...devices['Pixel 7'] });

const auditOrigin = process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_ORIGIN;
const measurementId = process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_MEASUREMENT_ID;
const productionMeasurementId = 'G-86D0QFW197';
const vendorHost =
  /(^|\.)(google-analytics\.com|googletagmanager\.com|googleadservices\.com|doubleclick\.net|googlesyndication\.com)$/;

function decodeLayers(value: string): string {
  for (let depth = 0; depth < 5; depth++) {
    try {
      const decoded = decodeURIComponent(value.replace(/\+/g, ' '));
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value;
}

test('inspects actual Google requests on the isolated audit stream', async ({
  page,
  context,
  baseURL,
}) => {
  let isolatedOrigin = false;
  let loopbackFixture = false;
  try {
    const configured = new URL(auditOrigin || '');
    isolatedOrigin =
      configured.origin === auditOrigin &&
      configured.origin === new URL(baseURL || '').origin &&
      !['mythoria.pt', 'www.mythoria.pt'].includes(configured.hostname) &&
      (configured.protocol === 'https:' ||
        ['localhost', '127.0.0.1'].includes(configured.hostname));
    loopbackFixture = ['localhost', '127.0.0.1'].includes(configured.hostname);
  } catch {
    isolatedOrigin = false;
  }
  test.skip(
    process.env.RUN_ANALYTICS_NETWORK_AUDIT !== '1' ||
      (process.env.PLAYWRIGHT_CLERK_FIXTURE === '1' && !loopbackFixture) ||
      !isolatedOrigin ||
      !measurementId ||
      !/^G-[A-Z0-9]+$/.test(measurementId) ||
      measurementId === productionMeasurementId,
    'Requires an approved isolated audit deployment and a separate test stream.',
  );
  test.setTimeout(60_000);

  const sentinels = {
    route: 'audit-private-route-7f4b5a',
    query: 'audit-private-query-7f4b5a',
    title: 'audit-private-title-7f4b5a',
    referrer: 'audit-private-referrer-7f4b5a',
    outbound: 'audit-private-outbound-7f4b5a',
  };
  const returnPath = `/en-US/s/${sentinels.route}?token=${sentinels.query}`;
  const collected: Array<{ url: string; payload: string; allowed: boolean }> = [];
  const collectionResponses: number[] = [];
  context.on('response', (response) => {
    const url = new URL(response.url());
    if (
      /(^|\.)google-analytics\.com$/.test(url.hostname) &&
      url.pathname === '/g/collect' &&
      url.searchParams.get('tid') === measurementId
    )
      collectionResponses.push(response.status());
  });

  // Guard every page and popup before navigation. Only the specified audit stream may leave
  // the browser; an unexpected vendor request is recorded and aborted, never sent to production.
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isVendor =
      vendorHost.test(url.hostname) ||
      ['bzr.openai.com', 'bzrcdn.openai.com'].includes(url.hostname);
    if (!isVendor) {
      if (
        url.origin === auditOrigin ||
        (loopbackFixture &&
          process.env.PLAYWRIGHT_CLERK_FIXTURE === '1' &&
          url.origin === 'https://clerk.fixture.invalid')
      )
        await route.fallback();
      else await route.abort();
      return;
    }
    const payload = [request.url(), request.postData() || '', request.headers().referer || ''].join(
      '\n',
    );
    const stream = url.searchParams.get('tid') || url.searchParams.get('id');
    const allowed =
      url.protocol === 'https:' &&
      !decodeLayers(payload).includes(productionMeasurementId) &&
      stream === measurementId &&
      ((url.hostname === 'www.googletagmanager.com' &&
        ['/gtag/js', '/gtag/destination'].includes(url.pathname)) ||
        (/(^|\.)google-analytics\.com$/.test(url.hostname) && url.pathname === '/g/collect'));
    collected.push({ url: request.url(), payload, allowed });
    if (allowed) await route.continue();
    else await route.abort();
  });

  const collectCount = () =>
    collected.filter(({ url, allowed }) => allowed && new URL(url).pathname === '/g/collect')
      .length;
  await context.clearCookies();
  await page.goto(
    `/en-US?token=${sentinels.query}&redirect_url=${encodeURIComponent(returnPath)}`,
    {
      referer: `https://audit-referrer.invalid/${sentinels.referrer}`,
    },
  );
  expect(collected).toHaveLength(0);
  await page.getByRole('button', { name: /analytics only/i }).click();
  expect(collected).toHaveLength(0);
  await page.goto('/en-US');
  await expect.poll(collectCount, { timeout: 15000 }).toBeGreaterThan(0);
  await expect
    .poll(() => collectionResponses.some((status) => status >= 200 && status < 300))
    .toBe(true);
  expect(
    collected.some(({ url, allowed }) => allowed && new URL(url).pathname === '/gtag/js'),
  ).toBe(true);

  await page.evaluate(
    ({ title, outbound, returnPath }) => {
      document.title = title;
      const link = document.createElement('a');
      link.href = `https://audit-share.invalid/${outbound}?return=${encodeURIComponent(encodeURIComponent(returnPath))}`;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = 'Synthetic outbound share';
      document.body.append(link);
    },
    { title: sentinels.title, outbound: sentinels.outbound, returnPath },
  );
  await page.getByRole('link', { name: 'Synthetic outbound share' }).click();
  await page.goto(
    `/en-US/sign-in?redirect_url=${encodeURIComponent(encodeURIComponent(returnPath))}`,
  );
  await page.reload();
  await page.goBack();
  await page.goto(`/en-US/s/${sentinels.route}/edit?token=${sentinels.query}`);
  await page.goto('/en-US/termsAndConditions');
  await page.getByRole('button', { name: /manage cookie settings/i }).click();
  await page.getByRole('button', { name: /reject optional/i }).click();
  await page.waitForTimeout(1_500);
  const afterWithdrawal = collected.length;
  await page.goto(`/en-US/pricing?token=${sentinels.query}`);
  await page.reload();
  await page.waitForTimeout(1_500);
  expect(collected).toHaveLength(afterWithdrawal);

  await page.goto('/en-US/termsAndConditions');
  await page.getByRole('button', { name: /manage cookie settings/i }).click();
  const beforeRegrant = collectCount();
  await page.getByRole('button', { name: /analytics only/i }).click();
  await expect.poll(collectCount).toBeGreaterThan(beforeRegrant);
  await page.goto('/en-US/pricing');
  await page.waitForTimeout(1_500);

  for (const { payload, allowed } of collected) {
    expect(allowed, 'Unexpected vendor request was blocked').toBe(true);
    for (const sentinel of Object.values(sentinels)) {
      expect(
        decodeLayers(payload).includes(sentinel),
        'Synthetic private value reached a vendor request',
      ).toBe(false);
    }
  }
});
