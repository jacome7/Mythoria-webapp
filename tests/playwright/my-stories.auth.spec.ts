import { test, expect } from '@playwright/test';

// Test assumes the auth.setup.ts project already ran and produced the storage state.
// It simply navigates to the protected my-stories page and asserts signed-in UI.

const LOCALE = 'en-US';

test.describe('Authenticated My Stories page', () => {
  test('loads my-stories with signed-in content', async ({ page }) => {
    await page.goto(`/${LOCALE}/my-stories`);

    // Expect absence of the signed out call-to-action and presence of story tabs or credits.
    // Signed out container has a sign-in button; we assert it's not visible.
    const signInButton = page.getByRole('link', { name: /sign in/i });
    if (await signInButton.isVisible()) {
      // If visible, then auth state failed to load; make this a hard failure with a hint.
      throw new Error('Expected authenticated session, but sign-in button is visible. Ensure auth.setup.ts ran and credentials are valid.');
    }

    // Check for tab elements (My Stories / My Characters) using their translated labels.
    // We fallback to checking at least one of them to avoid flaky translations.
    const tabCandidates = [/my stories/i, /my characters/i];
    let foundOne = false;
    for (const pattern of tabCandidates) {
      const locator = page.getByRole('link', { name: pattern }).or(page.getByRole('tab', { name: pattern }));
      if (await locator.count()) {
        foundOne = true; break;
      }
    }
    expect(foundOne, 'Expected at least one "My Stories" or "My Characters" tab visible.').toBeTruthy();
  });
});
