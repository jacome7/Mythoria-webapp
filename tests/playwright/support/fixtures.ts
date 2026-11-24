import { test as base } from '@playwright/test';

export { devices, expect } from '@playwright/test';
export type { APIRequestContext, Page } from '@playwright/test';

export const test = base.extend<{ clerkFixture: void }>({
  clerkFixture: [
    async ({ context, baseURL }, use) => {
      if (process.env.PLAYWRIGHT_CLERK_FIXTURE === '1') {
        const origin = new URL(baseURL ?? '').origin;
        const token = process.env.CLERK_FIXTURE_SESSION;
        if (
          !origin.startsWith('http://localhost:') ||
          process.env.CLERK_SECRET_KEY !== 'sk_live_fixture' ||
          !token
        ) {
          throw new Error('The synthetic Clerk fixture requires an isolated localhost server.');
        }

        // The default fixture stubs ClerkJS and the GA loader. Only the dedicated network
        // audit installs its own destination allowlist and forwards the real Google tag.
        const audit = process.env.RUN_ANALYTICS_NETWORK_AUDIT === '1';
        await context.route(
          (url) =>
            url.origin === 'https://clerk.fixture.invalid' ||
            (!audit &&
              url.origin === 'https://www.googletagmanager.com' &&
              url.pathname === '/gtag/js'),
          (route) => route.fulfill({ contentType: 'application/javascript', body: '' }),
        );
        await context.addInitScript(
          ({ origin, token }) => {
            if (location.origin !== origin) return;

            // Playwright's blocked register() returns undefined. Present the API as
            // unavailable so Workbox takes its normal unsupported-browser path.
            Reflect.deleteProperty(Navigator.prototype, 'serviceWorker');

            const user = {
              id: 'user_isolated_fixture',
              firstName: 'Browser',
              lastName: 'Fixture',
              fullName: 'Browser Fixture',
              emailAddresses: [],
              primaryEmailAddress: {
                emailAddress: 'author@fixture.invalid',
                verification: { status: 'verified' },
              },
            };
            const claims = JSON.parse(
              atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')),
            );
            const client = {
              id: 'client_fixture',
              activeSessions: [],
              signUp: {},
              signIn: {
                async create({ strategy, ticket }: { strategy: string; ticket: string }) {
                  if (strategy !== 'ticket' || ticket !== 'fixture-ticket') {
                    throw new Error('Invalid synthetic Clerk ticket');
                  }
                  return { status: 'complete', createdSessionId: 'sess_fixture' };
                },
              },
            };
            function readResources() {
              const signedIn = document.cookie
                .split('; ')
                .some((cookie) => cookie === `__session=${token}`);
              return {
                client,
                user: signedIn ? user : null,
                organization: null,
                session: signedIn
                  ? {
                      id: 'sess_fixture',
                      status: 'active',
                      user,
                      lastActiveToken: { jwt: { claims } },
                      getToken: async () => token,
                    }
                  : null,
              };
            }
            let snapshot = readResources();
            const listeners = new Set<(resources: typeof snapshot) => void>();
            const noop = () => {};
            Object.assign(window, {
              Clerk: {
                loaded: true,
                status: 'ready',
                get __internal_lastEmittedResources() {
                  return snapshot;
                },
                get user() {
                  return snapshot.user;
                },
                get session() {
                  return snapshot.session;
                },
                get isSignedIn() {
                  return !!snapshot.session;
                },
                client,
                async setActive({ session }: { session: string }) {
                  if (session !== 'sess_fixture') throw new Error('Invalid synthetic session ID');
                  document.cookie = `__session=${token}; path=/; SameSite=Lax`;
                  document.cookie = `__client_uat=${claims.iat}; path=/; SameSite=Lax`;
                  snapshot = readResources();
                  for (const listener of listeners) listener(snapshot);
                },
                addListener(listener: (resources: typeof snapshot) => void) {
                  listeners.add(listener);
                  listener(snapshot);
                  return () => listeners.delete(listener);
                },
                on(
                  event: string,
                  callback: (status: string) => void,
                  options?: { notify?: boolean },
                ) {
                  if (event === 'status' && options?.notify) callback('ready');
                },
                off: noop,
                __internal_updateProps: noop,
                mountSignIn: noop,
                unmountSignIn: noop,
                mountSignUp: noop,
                unmountSignUp: noop,
                mountUserButton: noop,
                unmountUserButton: noop,
              },
            });
          },
          { token, origin },
        );
      }
      await use();
    },
    { auto: true },
  ],
});
