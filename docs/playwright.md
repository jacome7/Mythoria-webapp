# WebApp browser testing

Run these commands from the WebApp repository.

```sh
npm ci
npx playwright install chromium
npm run test:e2e:isolated
```

The command requires Bash, rsync and a local PostgreSQL installation. On macOS, it detects Homebrew’s `postgresql@17` if the binaries are outside `PATH`. Set `E2E_PG_BIN` if your installation is elsewhere. Playwright uses its standard installed Chromium. You can pass a different Chromium executable with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

The runner creates a private scratch directory, initializes a disposable loopback database, copies the application source, builds Next.js and runs the Playwright projects. It seeds synthetic authors, books, FAQ and pricing records, and an active survey invitation. The server uses locally generated Clerk session tokens with real middleware verification. A test double supplies browser ClerkJS state and the Clerk Backend API’s user, testing ticket and OAuth responses. The runner leaves test and server logs at the printed scratch path and stops the application and database on exit.

The ordinary `chromium` project starts with a clean browser session. `chromium-session` uses the browser session established by the setup project for My Stories and private navigation. Authenticated mobile analytics provisions its own session, and the MCP OAuth tests use a bearer token independent of browser login.

## Real Clerk verification

Use an accountless or dedicated Clerk development instance. The accountless setup in Clerk’s official Next.js quickstart creates temporary development keys without linking a personal account. Provision one test user with an email containing `+clerk_test@` in that instance. Keep the app and tests on localhost and point the app at a disposable database. Verify that the instance has no webhook delivery to shared infrastructure. [Clerk’s accountless setup](https://clerk.com/docs/getting-started/quickstart/setup-clerk)

Use the development publishable and secret keys when starting the app. Export `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_E2E_EMAIL` and `PLAYWRIGHT_CLERK_TICKET_AUTH=1` for the test runner. Run `REFRESH_AUTH=1 npm run test:e2e -- --project=chromium-session`. Ticket setup uses a Playwright testing token for the dedicated development instance. [Clerk’s Playwright guide](https://clerk.com/docs/guides/development/testing/playwright/overview)

Run normal Playwright setup in headed mode for manual social or magic-link verification. Authenticated MCP calls require a Clerk OAuth bearer token scoped for the isolated environment. PWA network-loss checks need their own browser context with service workers enabled. The isolated suite blocks service workers to keep its analytics and Clerk fixture routes deterministic.

The WebApp reliability specs verify malformed router-state rejection, localized legacy links, image redirects, and the signed-in and signed-out reader paths. The authenticated fixture also traces literal `/null` requests while navigating from story generation to My Stories, opening the reader, and loading print pricing. The premium owner checkout test opens print from the desktop reader and narrow My Stories, confirms a square hardcover order, and verifies that replay creates one request and one credit debit. The isolated fixture uses manual fulfillment and a synthetic Admin ticket; it does not start the proof worker or contact a printer.
