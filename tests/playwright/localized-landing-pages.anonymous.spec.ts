import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const localizedLandings = [
  {
    locale: 'en-US',
    slug: 'personalized-vacation-book',
    title: 'Personalized vacation books that preserve the story behind your photos',
    intent: 'family_travels',
    samples: 8,
    readLabel: 'Read the chapter and view the image',
  },
  {
    locale: 'es-ES',
    slug: 'libro-personalizado-vacaciones',
    title: 'Libros personalizados para conservar la historia de tus vacaciones',
    intent: 'family_travels',
    samples: 8,
    readLabel: 'Leer el capítulo y ver la imagen',
  },
  {
    locale: 'fr-FR',
    slug: 'livre-personnalise-vacances',
    title: 'Des livres personnalisés pour raconter vos vacances',
    intent: 'family_travels',
    samples: 8,
    readLabel: 'Lire le chapitre et voir l’image',
  },
  {
    locale: 'en-US',
    slug: 'personalized-book-for-couples',
    title: 'Personalized book for couples',
    intent: 'romance',
    samples: 5,
    readLabel: 'Read the chapter and view the image',
  },
  {
    locale: 'es-ES',
    slug: 'libro-personalizado-para-parejas',
    title: 'Libro personalizado para parejas',
    intent: 'romance',
    samples: 5,
    readLabel: 'Leer el capítulo y ver la imagen',
  },
  {
    locale: 'fr-FR',
    slug: 'livre-personnalise-pour-couples',
    title: 'Livre personnalisé pour couples',
    intent: 'romance',
    samples: 5,
    readLabel: 'Lire le chapitre et voir l’image',
  },
  {
    locale: 'en-US',
    slug: 'personalized-book-for-grandparents-and-grandchildren',
    title: 'Personalized book for grandparents and grandchildren',
    intent: 'grandparents',
    samples: 5,
    readLabel: 'Read the chapter and view the image',
  },
  {
    locale: 'es-ES',
    slug: 'libro-personalizado-para-abuelos-y-nietos',
    title: 'Libro personalizado para abuelos y nietos',
    intent: 'grandparents',
    samples: 5,
    readLabel: 'Leer el capítulo y ver la imagen',
  },
  {
    locale: 'fr-FR',
    slug: 'livre-personnalise-pour-grands-parents-et-petits-enfants',
    title: 'Livre personnalisé pour grands-parents et petits-enfants',
    intent: 'grandparents',
    samples: 5,
    readLabel: 'Lire le chapitre et voir l’image',
  },
] as const;

const viewports = [
  { name: 'mobile', width: 402, height: 874 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

async function scrollThroughPage(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    for (
      let y = 0;
      y < document.documentElement.scrollHeight;
      y += Math.max(innerHeight - 80, 320)
    ) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
}

for (const landing of localizedLandings) {
  for (const viewport of viewports) {
    test(`${landing.locale}/${landing.slug} is complete on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const route = `/${landing.locale}/lp/${landing.slug}`;
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

      expect(response?.ok()).toBe(true);
      const rejectCookies = page.getByRole('button', {
        name: /Reject optional|Rechazar opcionales|Refuser les optionnels/,
      });
      if (await rejectCookies.isVisible()) await rejectCookies.click();

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(landing.title);
      await expect(page.locator('#exemplos article')).toHaveCount(landing.samples);
      await expect(page.locator('#exemplos audio')).toHaveCount(landing.samples);
      await expect(page.locator('a[data-cta-placement="hero_secondary"]')).toBeVisible();
      await expect(
        page.locator(
          `a[data-cta-placement="pricing_transparency"][href="/${landing.locale}/pricing"]`,
        ),
      ).toBeVisible();

      const primaryCta = page
        .locator(`a[href^="/${landing.locale}/tell-your-story/step-1?landingSlug="]`)
        .first();
      await expect(primaryCta).toHaveAttribute(
        'href',
        new RegExp(`primaryIntent=${landing.intent}`),
      );

      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://mythoria.pt${route}`,
      );
      await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(4);
      await expect(page.locator('link[rel="alternate"][hreflang="de-DE"]')).toHaveCount(0);

      await scrollThroughPage(page);
      const localizedImages = page.locator('img[src*="landing-pages"]');
      await expect(localizedImages).toHaveCount(landing.samples + 1);
      for (let index = 0; index < (await localizedImages.count()); index += 1) {
        const image = localizedImages.nth(index);
        const imageSource = await image.getAttribute('src');
        expect(imageSource).not.toBeNull();
        const imageResponse = await page.request.get(new URL(imageSource!, page.url()).href);
        expect(imageResponse.ok(), `Localized image failed to load: ${imageSource}`).toBe(true);
        expect(imageResponse.headers()['content-type']).toMatch(/^image\//);
      }
      await expect
        .poll(
          () =>
            localizedImages
              .first()
              .evaluate((element) => (element as HTMLImageElement).naturalWidth > 0),
          { message: 'Localized hero image was not decoded by the browser' },
        )
        .toBe(true);

      const firstSampleButton = page.getByRole('button', { name: landing.readLabel }).first();
      await firstSampleButton.click();
      const sampleDialog = page.locator('[role="dialog"][aria-modal="true"]');
      await expect(sampleDialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(sampleDialog).toBeHidden();

      const html = await page.content();
      expect(html).not.toContain('__MISSING__:');
      expect(html).not.toMatch(
        /Perguntas frequentes|Capítulo de amostra|Ler capítulo|Criar o meu|Conteúdo editorial Mythoria/,
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      ).toBeLessThanOrEqual(1);
    });
  }
}
