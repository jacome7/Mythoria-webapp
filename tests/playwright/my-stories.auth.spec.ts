import { test, expect } from '@playwright/test';

// Test assumes the auth.setup.ts project already ran and produced the storage state.
// It simply navigates to the protected my-stories page and asserts signed-in UI.

const LOCALE = 'en-US';

test.describe('Authenticated My Stories page', () => {
  test('loads my-stories with signed-in content', async ({ page }) => {
    await page.goto(`/${LOCALE}/my-stories`);

    // Expect absence of the signed out call-to-action and presence of the story-only toolbar.
    // Signed out container has a sign-in button; we assert it's not visible.
    const signInButton = page.getByRole('link', { name: /sign in/i });
    if (await signInButton.first().isVisible()) {
      // If visible, then auth state failed to load; make this a hard failure with a hint.
      throw new Error(
        'Expected authenticated session, but sign-in button is visible. Ensure auth.setup.ts ran and credentials are valid.',
      );
    }

    await expect(page.getByRole('link', { name: /new story/i })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(0);
  });
});
