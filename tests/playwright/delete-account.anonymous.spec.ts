import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

const locales = [
  ['en-US', 'Sign in', 'Delete My Account', 'Delete Account'],
  ['pt-PT', 'Iniciar sessão', 'Eliminar a Minha Conta', 'Eliminar Conta'],
  ['es-ES', 'Iniciar sesión', 'Eliminar mi cuenta', 'Eliminar cuenta'],
  ['fr-FR', 'Se connecter', 'Supprimer mon compte', 'Supprimer le compte'],
  ['de-DE', 'Anmelden', 'Mein Konto löschen', 'Konto löschen'],
] as const;

for (const [locale, signIn, deleteButton, confirmButton] of locales) {
  test(`${locale}: signed-out account deletion leads to local sign-in`, async ({ page }) => {
    const deletionPath = `/${locale}/privacy-policy/delete-account`;
    await page.goto(deletionPath, { waitUntil: 'domcontentloaded' });

    const signInLink = page
      .getByRole('link', { name: signIn, exact: true })
      .and(page.locator('a[href*="redirect="]'));
    await expect(signInLink).toBeVisible({ timeout: 30_000 });
    const steps = page.locator('ol').getByRole('listitem');
    await expect(steps).toHaveCount(2);
    await expect(steps.nth(0)).toContainText(deleteButton);
    await expect(steps.nth(1)).toContainText(confirmButton);
    await expect(page.getByRole('link', { name: 'dpo@mythoria.pt' })).toHaveAttribute(
      'href',
      'mailto:dpo@mythoria.pt',
    );

    const href = await signInLink.getAttribute('href');
    const entry = new URL(href!, page.url());
    expect(entry.pathname).toBe(`/${locale}/sign-in`);
    expect(entry.searchParams.get('auth_mode')).toBe('sign-in');
    expect(entry.searchParams.get('redirect')).toBe(deletionPath);

    const response = await page.goto(entry.href, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveURL(entry.href);
  });
}
