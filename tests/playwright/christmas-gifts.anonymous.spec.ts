import { expect, test } from '@playwright/test';

const editions = [
  {
    locale: 'pt-PT',
    slug: 'prendas-de-natal-para-criancas',
    heading: 'O que oferecer no Natal a uma criança que já tem tantos brinquedos?',
    fullBook: 'Ler o livro da Inês',
    create: 'Criar uma história',
  },
  {
    locale: 'es-ES',
    slug: 'regalos-de-navidad-y-reyes-para-ninos',
    heading: '¿Qué regalar por Navidad o Reyes a un niño que ya tiene de todo?',
    fullBook: 'Leer el cuento de Inés',
    create: 'Crear un cuento',
  },
];

for (const edition of editions) {
  for (const width of [390, 1440]) {
    test(`${edition.locale} Christmas books at ${width}px`, async ({ page, request }) => {
      await page.setViewportSize({ width, height: 900 });
      const path = `/${edition.locale}/lp/${edition.slug}`;
      expect((await page.goto(path, { waitUntil: 'domcontentloaded' }))?.ok()).toBe(true);
      const cookies = page.getByRole('button', { name: /Recusar opcionais|Rechazar opcionales/i });
      if (await cookies.isVisible()) await cookies.click();

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(edition.heading);
      const pricing = page.locator('[data-analytics-section="pricing_transparency"]');
      await expect(pricing.locator('dd')).toHaveText(['0 €', '≈ 18,33 €', '≈ 4,17 €', '≈ 22,50 €']);
      await expect(pricing).toContainText('25 €');
      await expect(pricing).toContainText('30 créditos');
      await expect(pricing).toContainText(
        edition.locale === 'pt-PT' ? '27 na encomenda' : '27 en el pedido',
      );
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
        'href',
        `https://mythoria.pt${path}`,
      );
      for (const other of editions) {
        await expect(page.locator(`link[hreflang="${other.locale}"]`)).toHaveAttribute(
          'href',
          `https://mythoria.pt/${other.locale}/lp/${other.slug}`,
        );
      }
      const fullBook = page.getByRole('link', { name: edition.fullBook, exact: true }).first();
      await expect(fullBook).toBeVisible();
      const pdf = await request.head((await fullBook.getAttribute('href'))!);
      expect(pdf.ok()).toBe(true);
      expect(pdf.headers()['content-type']).toContain('application/pdf');
      await expect(page.locator('a[data-cta-placement=hero_primary]')).toHaveText(edition.create);
      const create = page.locator('a[data-cta-placement=hero_primary]');
      await expect(create).toHaveAttribute('href', /\/sign-up\?/, { timeout: 20_000 });
      const signup = new URL((await create.getAttribute('href'))!, page.url());
      const returnTo = new URL(signup.searchParams.get('redirect')!, page.url());
      expect(returnTo.pathname).toBe(`/${edition.locale}/tell-your-story/step-1`);
      expect(returnTo.searchParams.get('landingSlug')).toBe(edition.slug);
      const samples = page.locator('#exemplos');
      await expect(samples.locator('article')).toHaveCount(5);
      await expect(samples.locator('audio')).toHaveCount(4);
      await expect(samples.locator('a[data-cta-placement=full_book_pdf]')).toHaveAttribute(
        'href',
        `/seasonal-books/ines/${edition.locale}/leitura.pdf`,
      );
      const buttons = samples.locator('article button');
      await expect(buttons).toHaveCount(4);
      for (const button of await buttons.all()) {
        await button.click();
        const dialog = page.locator('[role="dialog"][aria-modal="true"]');
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('p').last()).not.toBeEmpty();
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      ).toBeLessThanOrEqual(1);
      await create.click();
      await expect(page).toHaveURL(new RegExp('/' + edition.locale + '/sign-up'));
    });
  }
}
