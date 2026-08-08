import { expect, test, type Page } from '@playwright/test';

const route = '/pt-PT/lp/livro-personalizado-crianca';
const titles = [
  'Mia e a Pastelaria da Lua',
  'Tomás e o Mapa das Portas Escondidas',
  'Lia e o Jardim das Palavras Perdidas',
  'A Equipa que Marcou um Golo nas Estrelas',
  'Inês e o Robô Feito de Desenhos',
] as const;

async function assertNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.describe('personalized children books landing', () => {
  test('renders the approved page, media and signed-out CTA without public fictional framing', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', (request) => {
      const errorText = request.failure()?.errorText ?? 'unknown request failure';
      if (errorText !== 'net::ERR_ABORTED') {
        failedRequests.push(`${errorText}: ${request.url()}`);
      }
    });

    await page.goto(route, { waitUntil: 'networkidle' });

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Crie um livro personalizado onde a criança é a heroína.',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Criar um livro para uma criança' }).first(),
    ).toHaveAttribute(
      'href',
      '/pt-PT/tell-your-story/step-1?landingSlug=livro-personalizado-crianca&primaryIntent=kids_adventures',
    );
    await expect(page.getByRole('link', { name: 'Ver livros criados' })).toHaveAttribute(
      'href',
      '#exemplos',
    );
    await expect(
      page.getByRole('heading', { name: 'O resultado é único e pessoal, não é genérico.' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Personalize os detalhes que tornam a história única.' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Limites' })).toHaveCount(0);
    const expectedReviewDate = new Intl.DateTimeFormat('pt-PT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.now() - 17 * 24 * 60 * 60 * 1000));
    await expect(
      page.getByText(`Conteúdo editorial Mythoria · Revisto em ${expectedReviewDate}`),
    ).toBeVisible();

    for (const title of titles)
      await expect(page.getByRole('heading', { level: 3, name: title })).toBeVisible();
    await expect(page.locator('audio')).toHaveCount(5);
    await expect(page.getByText('Ler a transcrição do excerto')).toHaveCount(5);
    await expect(page.locator('body')).not.toContainText(/ficcional|exemplo ficcional/i);
    await expect(page.locator('body')).not.toContainText(
      /testemunho|família real|história de cliente/i,
    );

    const chapterButtons = page.getByRole('button', { name: 'Ler capítulo e ver imagem' });
    await expect(chapterButtons).toHaveCount(5);
    for (let index = 0; index < 5; index += 1) {
      await chapterButtons.nth(index).click();
      const dialog = page.getByRole('dialog', { name: titles[index] });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('heading', { level: 3, name: titles[index] })).toBeVisible();
      await expect(dialog.getByRole('link', { name: 'Ler capítulo de amostra' })).toHaveAttribute(
        'href',
        new RegExp(`/pt-PT/sample-books/`),
      );
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }

    const audioChecks = await page.locator('audio').evaluateAll(async (elements) => {
      return Promise.all(
        elements.map(
          (element) =>
            new Promise<{ source: string; duration: number }>((resolve, reject) => {
              const audio = element as HTMLAudioElement;
              const timer = window.setTimeout(
                () => reject(new Error(`Audio timeout: ${audio.currentSrc}`)),
                15_000,
              );
              const finish = () => {
                window.clearTimeout(timer);
                audio.currentTime = Math.min(
                  0.25,
                  Number.isFinite(audio.duration) ? audio.duration : 0,
                );
                audio.pause();
                resolve({ source: audio.currentSrc, duration: audio.duration });
              };
              if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) finish();
              else {
                audio.addEventListener('loadedmetadata', finish, { once: true });
                audio.addEventListener(
                  'error',
                  () => reject(new Error(`Audio failed: ${audio.currentSrc}`)),
                  {
                    once: true,
                  },
                );
                audio.load();
              }
            }),
        ),
      );
    });
    expect(audioChecks).toHaveLength(5);
    expect(
      audioChecks.every((audio) => audio.source.endsWith('.mp3') && audio.duration >= 30),
    ).toBe(true);

    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });

  for (const width of [320, 375, 768, 1024, 1440]) {
    test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width <= 375 ? 874 : 900 });
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await assertNoHorizontalOverflow(page);
      if (width === 375 || width === 1440) {
        await page.screenshot({
          path: test.info().outputPath(`personalized-children-${width}.png`),
          fullPage: true,
        });
      }
    });
  }
});
