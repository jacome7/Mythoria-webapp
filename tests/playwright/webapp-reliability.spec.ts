import { expect, test } from './support/fixtures';

const storyId = '00000000-0000-4000-8000-000000000002';

test('serves public pages, rejects invalid navigation state, and resolves legacy URLs', async ({
  page,
  request,
}) => {
  const home = await page.goto('/en-US');
  expect(home?.status()).toBe(200);
  expect(await page.locator('#structured-data').textContent()).toContain('/icon-512.png');
  const bad = await request.get('/en-US', {
    headers: { rsc: '1', 'next-router-state-tree': 'invalid' },
  });
  expect(bad.status()).toBe(400);
  expect(bad.headers()['cache-control']).toBe('no-store');

  for (const locale of ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE']) {
    const response = await request.get(`/${locale}/stories?ref=legacy`, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(`/${locale}/my-stories?ref=legacy`);
    expect((await request.get(response.headers().location)).status()).toBe(200);
  }
  for (const path of [
    '/icon-512.png',
    '/assets/og/mythoria_en.jpg',
    '/assets/og/mythoria_pt.jpg',
  ]) {
    const image = await request.get(path);
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toMatch(/^image\//);
  }
});

test('opens a public story without fetching private chapters on signed-out pages', async ({
  page,
}) => {
  test.skip(process.env.PLAYWRIGHT_CLERK_FIXTURE !== '1', 'Requires the disposable fixture.');
  const privateRequests: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith(`/api/stories/${storyId}/chapters`)) privateRequests.push(pathname);
  });

  await page.goto('/pt-PT/p/mateus-e-o-leo');
  await expect(
    page.getByRole('heading', { name: 'Mateus e o Léo', exact: true }).first(),
  ).toBeVisible();

  for (const suffix of ['', '/chapter/1']) {
    const path = `/en-US/stories/read/${storyId}${suffix}`;
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Access Restricted' })).toBeVisible();
    await expect(
      page.locator(`a[href="/en-US/sign-in?redirect=${encodeURIComponent(path)}"]`),
    ).toBeVisible();
  }
  expect(privateRequests).toEqual([]);
});
