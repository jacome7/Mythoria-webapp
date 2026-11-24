import { readFileSync } from 'node:fs';
import { test, expect } from './support/fixtures';
import { assertNoMissingTranslations, gotoAndCheck } from './support/navigation';

for (const locale of ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE']) {
  const messages = (file: string) =>
    JSON.parse(readFileSync(`src/messages/${locale}/${file}.json`, 'utf8'));

  test(`Navigate signed-in account pages in ${locale}`, async ({ page }) => {
    await gotoAndCheck(page, `/${locale}/my-stories`);
    await expect(
      page.getByRole('link', { name: messages('MyStoriesPage').writeNewStory, exact: true }),
    ).toBeVisible();

    await gotoAndCheck(page, `/${locale}/my-characters`);
    await expect(
      page.getByRole('button', {
        name: messages('MyCharactersPage').MyCharactersPage.createCharacter,
        exact: true,
      }),
    ).toBeVisible();

    const profileResponses = ['/api/profile', '/api/stories/count', '/api/my-credits'].map((path) =>
      page.waitForResponse((response) => new URL(response.url()).pathname === path),
    );
    const [responses] = await Promise.all([
      Promise.all(profileResponses),
      gotoAndCheck(page, `/${locale}/profile`),
    ]);
    for (const response of responses) expect(response.ok(), response.url()).toBe(true);
    await expect(
      page.getByRole('heading', { name: messages('ProfilePage').ProfilePage.title, exact: true }),
    ).toBeVisible();

    await gotoAndCheck(page, `/${locale}/buy-credits`);
    await expect(
      page.getByRole('heading', {
        name: messages('CreditsDisplay').Voucher.sectionHeading,
        exact: true,
      }),
    ).toBeVisible();
  });

  test(`Continue from the story entry page to step two in ${locale}`, async ({ page }) => {
    const rejectCookies = page.getByRole('button', {
      name: messages('CookieConsent').rejectAll,
      exact: true,
    });
    await page.addLocatorHandler(rejectCookies, () => rejectCookies.click());
    const wizard = `/${locale}/tell-your-story`;
    const [authorResponse] = await Promise.all([
      page.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/me'),
      gotoAndCheck(page, wizard, `${wizard}/step-1`),
    ]);
    expect(authorResponse.ok()).toBe(true);
    const author = page.locator('input[required]');
    await expect(author).toBeVisible();
    await author.fill('Story Author');
    await page
      .getByRole('button', { name: messages('StepNavigation').StepNavigation.next, exact: true })
      .click();
    await expect(page).toHaveURL((url) => url.pathname === `${wizard}/step-2`);
    await expect(
      page.getByRole('heading', {
        name: messages('StorySteps').StorySteps.step2.guided.headings.howToStart,
        exact: true,
      }),
    ).toBeVisible();
    await assertNoMissingTranslations(page);
  });
}
