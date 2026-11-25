import { expect, test } from './support/fixtures';
import en from '../../src/messages/en-US/PremiumBook.json';
import pt from '../../src/messages/pt-PT/PremiumBook.json';
import es from '../../src/messages/es-ES/PremiumBook.json';
import fr from '../../src/messages/fr-FR/PremiumBook.json';
import de from '../../src/messages/de-DE/PremiumBook.json';
import actions from '../../src/messages/pt-PT/Actions.json';
import printOrder from '../../src/messages/pt-PT/PrintOrder.json';
import publishedBook from '../../src/lib/premium-children-book/worker-manifest.fixture.json';

const locales = { 'en-US': en, 'pt-PT': pt, 'es-ES': es, 'fr-FR': fr, 'de-DE': de };

test.describe('Premium book format', () => {
  test.skip(process.env.PLAYWRIGHT_CLERK_FIXTURE !== '1', 'Requires the disposable fixture.');

  for (const [locale, copy] of Object.entries(locales)) {
    test(`saves the format, reviews it and switches back in ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width: 402, height: 874 });
      const created = await page.request.post('/api/stories', {
        data: { title: 'Inês e o Barquinho', status: 'draft', storyLanguage: locale },
      });
      expect(created.status()).toBe(201);
      const { story } = await created.json();
      const storyPath = `/api/my-stories/${story.storyId}`;

      try {
        expect(
          (
            await page.request.put(storyPath, {
              data: {
                targetAudience: 'children_3-6',
                novelStyle: 'fantasy',
                graphicalStyle: 'papercut',
              },
            })
          ).ok(),
        ).toBe(true);
        await page.addInitScript((id) => localStorage.setItem('currentStoryId', id), story.storyId);
        await page.goto(`/${locale}/tell-your-story/step-4`);
        const premium = page.getByRole('radio', { name: copy.title });
        const chapters = page.locator('#book-chapter-count');
        await expect(chapters).toBeVisible();
        await premium.click();
        await expect(premium).toBeChecked();
        await expect(chapters).toHaveCount(0);
        expect((await (await page.request.get(storyPath)).json()).story.bookType).toBe(
          'premium_children',
        );

        await page.reload();
        await expect(premium).toBeChecked();
        await page.goto(`/${locale}/tell-your-story/step-5`);
        await expect(page.getByRole('heading', { name: copy.title })).toBeVisible();

        await page.goto(`/${locale}/tell-your-story/step-4`);
        await page.locator('#book-target-audience').selectOption('children_7-10');
        await expect(page.getByText(copy.correctFormat)).toBeVisible();
        await page.getByRole('radio', { name: copy.standard }).click();
        await expect(chapters).toBeVisible();
        expect((await (await page.request.get(storyPath)).json()).story.bookType).toBe('standard');
      } finally {
        await page.request.delete(storyPath);
      }
    });
  }

  test('orders one paid square hardcover after opening print from the reader and narrow My Stories', async ({
    page,
  }) => {
    const { storyId, opening, revision } = publishedBook;
    const { PrintOrder: copy } = printOrder;
    const checkoutPath = `/pt-PT/stories/print/${storyId}`;
    const creditsPath = '/api/my-credits';
    const requestsPath = '/api/print-requests';

    await page.setViewportSize({ width: 1150, height: 850 });
    await page.goto(`/pt-PT/stories/read/${storyId}`);
    await page.getByRole('button', { name: 'Recusar opcionais' }).click();
    await page.getByRole('button', { name: actions.Actions.print, exact: true }).click();
    await expect(page).toHaveURL(checkoutPath);
    await expect(page.getByRole('heading', { name: opening.title })).toBeVisible();

    await page.setViewportSize({ width: 402, height: 874 });
    await page.goto('/pt-PT/my-stories');
    await page.locator(`[data-story-menu="${storyId}"]`).click();
    await page
      .locator(`[data-story-menu-panel="${storyId}"]`)
      .getByRole('button', { name: actions.Actions.print, exact: true })
      .click();
    await expect(page).toHaveURL(checkoutPath);

    const before = await page.request.get(creditsPath);
    expect(before.ok()).toBe(true);
    const { currentBalance: previousBalance } = await before.json();
    await page.getByRole('button', { name: copy.buttons.continue }).click();
    await expect(page.getByText('Rua do Livro 10', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: copy.buttons.continue }).click();
    await expect(page.getByText(copy.payment.squareHardcoverTitle)).toBeVisible();
    await expect(page.getByText(copy.payment.softcoverTitle)).toHaveCount(0);
    await page.getByRole('button', { name: copy.buttons.placeOrder }).click();
    const submitted = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === requestsPath && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: copy.buttons.confirm }).click();
    const response = await submitted;
    const checkout = response.request().postDataJSON();
    expect(checkout).toMatchObject({
      checkout: {
        storyId,
        numberOfCopies: 1,
        totalCost: 27,
        printingOption: { serviceCode: 'printedHardCover', editionRevision: revision },
      },
    });
    const order = await response.json();
    expect(order).toMatchObject({ success: true, request: { storyId, status: 'requested' } });
    await expect(page.getByRole('heading', { name: copy.confirmation.title })).toBeVisible();

    const replay = await page.request.post(requestsPath, { data: checkout });
    expect(replay.ok()).toBe(true);
    expect((await replay.json()).request.id).toBe(order.request.id);
    const orderList = await page.request.get(`${requestsPath}?storyId=${storyId}`);
    expect(orderList.ok()).toBe(true);
    expect((await orderList.json()).requests.map((request: { id: string }) => request.id)).toEqual([
      order.request.id,
    ]);
    const after = await page.request.get(creditsPath);
    expect(after.ok()).toBe(true);
    expect((await after.json()).currentBalance).toBe(previousBalance - 27);
  });

  test('renders and authorizes a published copy across owner, public, and revoked share routes', async ({
    page,
    browser,
    baseURL,
  }) => {
    const { storyId, opening, pages, spreads } = publishedBook;
    const mixed = spreads.find((spread) => spread.textLayout === 'right_only')!;
    const article = (number: number) => page.getByRole('article', { name: `Página ${number}` });
    const assetUrl = `/api/stories/${storyId}/premium/front`;
    const motifUrl = `/api/stories/${storyId}/premium/motif`;
    const shareSettings = `/api/stories/${storyId}/share`;
    const anonymous = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });

    try {
      expect((await anonymous.request.get(assetUrl)).status()).toBe(404);
      expect((await anonymous.request.get(motifUrl)).status()).toBe(404);
      await page.setViewportSize({ width: 1150, height: 850 });
      await page.goto(`/pt-PT/stories/read/${storyId}`);
      await page.getByRole('button', { name: 'Recusar opcionais' }).click();
      const picker = page.getByRole('combobox', { name: pt.goToPage });
      await expect(page.getByRole('heading', { name: opening.title })).toBeVisible();
      await expect(page.getByRole('group', { name: pt.frontCover }).locator('svg')).toHaveCount(0);
      await picker.selectOption('1');
      await expect(article(1)).toHaveCSS('background-color', 'rgb(249, 239, 217)');
      const firstMotif = article(1).locator('img');
      await expect(firstMotif).toHaveAttribute('aria-hidden', 'true');
      const motifSource = await firstMotif.getAttribute('src');
      expect(motifSource).toContain(motifUrl);
      await picker.selectOption('2');
      await expect(article(2)).toHaveCSS('background-color', 'rgb(249, 239, 217)');
      await expect(article(2).locator('img, svg')).toHaveCount(0);
      await expect(article(3).locator('img')).toHaveAttribute('src', motifSource!);
      await picker.selectOption('4');
      await expect(article(4)).toHaveCSS('background-color', 'rgb(249, 239, 217)');
      await expect(article(4).locator('img, svg')).toHaveCount(0);
      await expect(article(5)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await picker.selectOption('32');
      await expect(article(32)).toBeVisible();
      await expect(
        article(33).getByRole('heading', { name: 'Gostaste desta história?' }),
      ).toBeVisible();
      await expect(
        article(33).getByRole('link', { name: 'Cria a tua história na Mythoria' }),
      ).toHaveAttribute('href', '/pt-PT/tell-your-story');
      await expect(article(33).locator('img')).toHaveAttribute(
        'src',
        /Logo_transparent_background_1024x683/,
      );
      await expect(article(33).locator('svg')).toHaveCount(0);
      await page.getByRole('button', { name: pt.next }).click();
      await expect(page.getByRole('group', { name: pt.backCover })).toBeVisible();

      const motifRequests = new RegExp(`${motifUrl}\\?`);
      await page.route(motifRequests, (route) => route.abort());
      await page.reload();
      await picker.selectOption('1');
      await expect(article(1).locator('svg')).toHaveAttribute('aria-hidden', 'true');
      await picker.selectOption('2');
      await expect(article(3).locator('svg')).toBeVisible();
      await page.unroute(motifRequests);
      await picker.selectOption(String(mixed.leftPage));
      await expect(article(mixed.leftPage)).toBeVisible();
      await expect(article(mixed.rightPage)).toBeVisible();
      await expect(
        article(mixed.leftPage).getByRole('img', {
          name: mixed.leftDescription ?? `Página ${mixed.leftPage}`,
        }),
      ).toBeVisible();
      await expect(article(mixed.leftPage).locator('p')).toHaveCount(0);
      await expect(article(mixed.rightPage)).toContainText(pages[mixed.rightPage - 1].text);
      const priorPage = page.getByRole('button', { name: pt.previous });
      await priorPage.focus();
      await page.keyboard.press('ArrowRight');
      await expect(article(mixed.rightPage + 1)).toBeVisible();

      await page.setViewportSize({ width: 402, height: 874 });
      await picker.selectOption(String(mixed.leftPage));
      await expect(article(mixed.leftPage)).toBeVisible();
      await expect(article(mixed.rightPage)).toHaveCount(0);
      await expect
        .poll(async () => {
          const box = await article(mixed.leftPage).boundingBox();
          return box ? Math.abs(box.height - box.width) : Number.POSITIVE_INFINITY;
        })
        .toBeLessThan(2);
      await page.getByRole('button', { name: pt.next }).click();
      await expect(article(mixed.rightPage)).toBeVisible();

      const shared = await page.request.post(shareSettings, {
        data: { allowEdit: false, makePublic: false, expiresInDays: 1 },
      });
      expect(shared.ok()).toBe(true);
      const { token } = await shared.json();
      const sharedContent = `/api/share/${token}`;
      expect((await anonymous.request.get(sharedContent)).status()).toBe(401);
      await page.goto(`/pt-PT/s/${token}`);
      await expect(page.getByRole('heading', { name: opening.title })).toBeVisible();
      const sharedView = await (await page.request.get(sharedContent)).json();
      expect((await page.request.get(sharedView.premiumBook.front)).status()).toBe(200);
      expect((await page.request.get(sharedView.premiumBook.motifImage)).status()).toBe(200);
      expect((await page.request.delete(`${shareSettings}?linkId=${token}`)).ok()).toBe(true);
      expect((await page.request.get(sharedContent)).status()).toBe(410);
      expect((await page.request.get(sharedView.premiumBook.front)).status()).toBe(404);
      expect((await page.request.get(sharedView.premiumBook.motifImage)).status()).toBe(404);

      const published = await page.request.post(shareSettings, { data: { makePublic: true } });
      expect(published.ok()).toBe(true);
      const { url } = await published.json();
      const publicPage = await anonymous.request.get(`/pt-PT${url}`);
      expect(publicPage.ok()).toBe(true);
      expect(await publicPage.text()).not.toContain(pages[mixed.rightPage - 1].text);
      expect((await anonymous.request.get(assetUrl)).status()).toBe(200);
      expect((await anonymous.request.get(`/api${url}`)).headers()['cache-control']).toBe(
        'private, no-store',
      );
      expect((await page.request.post(shareSettings, { data: { makePublic: false } })).ok()).toBe(
        true,
      );
      expect((await anonymous.request.get(assetUrl)).status()).toBe(404);
      expect((await anonymous.request.get(`/api${url}`)).status()).toBe(403);
    } finally {
      await anonymous.close();
    }
  });
});
