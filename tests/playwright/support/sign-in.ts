import { createClerkClient } from '@clerk/backend';
import type { Page } from '@playwright/test';

export async function signInWithClerkTicket(page: Page, baseURL?: string) {
  const { CLERK_SECRET_KEY, CLERK_E2E_EMAIL, PLAYWRIGHT_CLERK_FIXTURE } = process.env;
  const origin = new URL(baseURL ?? '');
  if (!['localhost', '127.0.0.1'].includes(origin.hostname)) {
    throw new Error('Clerk ticket authentication requires a local WebApp test server.');
  }

  const synthetic = PLAYWRIGHT_CLERK_FIXTURE === '1' && CLERK_SECRET_KEY === 'sk_live_fixture';
  if (
    !CLERK_E2E_EMAIL ||
    !CLERK_SECRET_KEY ||
    (!synthetic &&
      (!CLERK_SECRET_KEY.startsWith('sk_test_') || !/\+clerk_test@/i.test(CLERK_E2E_EMAIL)))
  ) {
    throw new Error(
      'Use a pre-provisioned +clerk_test identity on a dedicated Clerk development instance.',
    );
  }

  const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });
  const users = await clerk.users.getUserList({ emailAddress: [CLERK_E2E_EMAIL] });
  if (users.data.length !== 1) {
    throw new Error('Provision exactly one matching test user in the Clerk development instance.');
  }
  const ticket = await clerk.signInTokens.createSignInToken({
    userId: users.data[0].id,
    expiresInSeconds: 300,
  });

  await page.context().clearCookies();
  if (!synthetic) {
    const { clerkSetup, setupClerkTestingToken } = await import('@clerk/testing/playwright');
    await clerkSetup();
    await setupClerkTestingToken({ page });
  }
  await page.goto('/en-US/sign-in', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    Boolean((window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded),
  );
  await page.evaluate(async (token) => {
    const clerk = (
      window as unknown as {
        Clerk: {
          client: {
            signIn: {
              create: (params: { strategy: 'ticket'; ticket: string }) => Promise<{
                status: string;
                createdSessionId?: string | null;
              }>;
            };
          };
          setActive: (params: { session: string }) => Promise<void>;
        };
      }
    ).Clerk;
    const signIn = await clerk.client.signIn.create({ strategy: 'ticket', ticket: token });
    if (signIn.status !== 'complete' || !signIn.createdSessionId) {
      throw new Error(`Ticket sign-in did not complete: ${signIn.status}`);
    }
    await clerk.setActive({ session: signIn.createdSessionId });
  }, ticket.token);
}
