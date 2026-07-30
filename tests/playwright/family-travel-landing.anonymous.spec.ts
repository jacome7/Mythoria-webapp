import { expect, test } from '@playwright/test';

const route = '/pt-PT/lp/livro-personalizado-ferias';

for (const viewport of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`family travel landing is complete and responsive on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

    expect(response?.ok()).toBe(true);
    const rejectCookies = page.getByRole('button', { name: 'Rejeitar Todos' });
    if (await rejectCookies.isVisible()) await rejectCookies.click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Livros personalizados para guardar a história das suas férias',
    );
    await expect(
      page.getByRole('link', { name: 'Criar o meu livro de férias' }).first(),
    ).toHaveAttribute(
      'href',
      '/pt-PT/tell-your-story/step-1?landingSlug=livro-personalizado-ferias&primaryIntent=family_travels',
    );
    await expect(
      page.getByRole('link', { name: 'Ver exemplos de livros de viagem' }),
    ).toHaveAttribute('href', '#exemplos');
    const hero = page.locator('[data-analytics-section="hero"]');
    await expect(hero.getByText('Conta adulta', { exact: true })).toHaveCount(0);
    await expect(hero.getByText('Privado por defeito', { exact: true })).toHaveCount(0);
    await expect(hero.getByText('Reveja antes de partilhar', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Conteúdo editorial Mythoria/)).toHaveCount(0);
    await expect(page.getByText(/ficcion/i)).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Guarde a aventura sem guardar informação a mais' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Mais narrativa do que um álbum tradicional' }),
    ).toBeVisible();
    await expect(
      page.locator('[data-analytics-section="product_comparison"] tbody tr'),
    ).toHaveCount(4);
    await expect(page.locator('#exemplos article')).toHaveCount(8);
    await expect(page.locator('#exemplos audio')).toHaveCount(8);
    await expect(
      page.locator('#exemplos').getByText('Capítulo de amostra', { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator('#exemplos').getByText(/^Áudio \d+ s$/)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Explorar uma parceria' })).toHaveAttribute(
      'href',
      '/pt-PT/partners',
    );
    await expect(page.getByRole('heading', { name: 'Perguntas frequentes' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'index,follow,max-snippet:-1,max-image-preview:large',
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://mythoria.pt/pt-PT/lp/livro-personalizado-ferias',
    );

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    const firstSampleButton = page
      .getByRole('button', { name: 'Ler capítulo e ver imagem' })
      .first();
    await firstSampleButton.click();
    const dialog = page.getByRole('dialog', { name: 'A Leonor e o Segredo do Oceanário' });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: 'A pista junto ao vidro azul' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(firstSampleButton).toBeFocused();

    const html = await page.content();
    expect(html).not.toContain('__MISSING__:');
    expect(html).not.toContain('AggregateRating');
  });
}
