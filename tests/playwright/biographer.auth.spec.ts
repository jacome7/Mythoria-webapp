import { test, expect } from '@playwright/test';

// Authenticated browser shell; every Biographer request below is intercepted, so no database,
// provider or paid API is contacted. Run with the normal Playwright auth setup and local server.
test('saves a written memory and reviews a private photograph', async ({ page }) => {
  const projectId = '11111111-1111-4111-8111-111111111111';
  const assetId = '22222222-2222-4222-8222-222222222222';
  const detail = {
    project: {
      id: projectId,
      title: 'A family story',
      locale: 'en-US',
      revision: 0,
      proposal: null,
    },
    participant: { id: '33333333-3333-4333-8333-333333333333', role: 'owner', name: 'Author' },
    turns: [] as Array<Record<string, unknown>>,
    segments: [],
    assets: [{ id: assetId, caption: 'Our holiday' }],
  };
  await page.route(`**/api/biographer/projects/${projectId}/photos/${assetId}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    }),
  );
  await page.route(`**/api/biographer/projects/${projectId}/interview`, async (route) => {
    const body = route.request().postDataJSON();
    detail.turns.push({
      id: body.id,
      role: 'user',
      text: body.text,
      included: true,
      final: true,
      createdAt: new Date().toISOString(),
    });
    await route.fulfill({ json: { turn: detail.turns[0], question: 'What happened next?' } });
  });
  await page.route(`**/api/biographer/projects/${projectId}`, (route) =>
    route.fulfill({ json: detail }),
  );
  await page.goto(`/en-US/biographer/${projectId}`);
  await expect(page.getByRole('heading', { name: 'A family story' })).toBeVisible();
  await expect(page.getByText('Paused', { exact: true })).toBeVisible();
  await page.getByLabel('Write an answer').fill('We discovered a little café in Andorra.');
  await page.getByRole('button', { name: 'Save answer' }).click();
  await expect(page.getByText('We discovered a little café in Andorra.')).toBeVisible();
  await page.getByRole('tab', { name: 'My Memories' }).click();
  const photo = page.getByAltText('Our holiday');
  await expect(photo).toBeVisible();
  await expect(photo).toHaveAttribute(
    'src',
    `/api/biographer/projects/${projectId}/photos/${assetId}`,
  );
});
