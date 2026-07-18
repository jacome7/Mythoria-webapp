import { expect, test } from '@playwright/test';

const route = '/pt-PT/lp/livro-personalizado-para-casais';

for (const viewport of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`romance landing is complete and responsive on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

    expect(response?.ok()).toBe(true);
    await page.waitForLoadState('networkidle');
    const rejectCookies = page.getByRole('button', { name: 'Rejeitar Todos' });
    if (await rejectCookies.isVisible()) await rejectCookies.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Livro personalizado para casais',
    );
    await expect(page.getByText('Privado por defeito', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Reveja antes de oferecer', { exact: true })).toBeVisible();
    await expect(page.locator('#exemplos article')).toHaveCount(5);
    await expect(page.locator('#exemplos audio')).toHaveCount(5);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'index,follow,max-snippet:-1,max-image-preview:large',
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://mythoria.pt/pt-PT/lp/livro-personalizado-para-casais',
    );

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    const firstSampleButton = page
      .getByRole('button', { name: 'Ler capítulo e ver imagem' })
      .first();
    await firstSampleButton.click();
    const dialog = page.getByRole('dialog', { name: 'Inês & Diogo — Um Amor Inesperado' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Três Minutos de Chuva' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(firstSampleButton).toBeFocused();

    const html = await page.content();
    expect(html).not.toContain('__MISSING__:');
    expect(html).not.toContain('AggregateRating');
  });
}
