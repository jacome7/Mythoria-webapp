# Authentication and purchase continuity

## Credit purchase

The buy-credits page validates `package` against the current active catalogue before exposing login/signup links. IDs must be positive decimal integers and must exist; malformed or unavailable selections return to the normal package picker. Catalogue failure exposes a retry and does not silently discard a selected package.

Both auth entry links use `buildAuthEntryPath` with a localized return URL. Explicit Clerk auth-switch URLs and the first-lead sign-in redirect preserve the safe return across signup/login. Existing `redirectUrl` remains accepted, but generated URLs use `redirect`. Signup's explicit login link also emits `auth_mode=sign-in`: this navigation-only marker bypasses the initial lead-to-signup redirect, preventing a loop for leads who already have an account. It is not used for authentication/authorization or forwarded to the final destination. Initial lead visits without that marker retain the signup redirect. The server-rendered sign-in page does not attempt to update cookies, which Next.js forbids during rendering.

`useCart(initialPackageId)` applies a validated URL selection once per mount, after catalogue loading. `undefined` means unresolved; `null` means no valid selection. Later quantity/removal changes and catalogue rerenders do not reset the cart. Auth completion returns to the cart; it never initiates payment automatically.

## Landing creation CTAs

`LandingCreationLink` resolves Clerk before exposing an active creation link. Anonymous visitors go directly to localized signup; signed-in visitors go to step 1. Hero/final/helper CTAs and challenge cards use it. Custom contact/pricing/example destinations retain ordinary link behavior.

Header creation navigation uses the same component with `onlyOnLanding`. Outside a landing its destination is unchanged. The server-rendered `landing-page-top` element exposes `data-primary-intent`, allowing the shared header outside the template to use the landing's intent without bundling the content catalogue in the client. Challenge-specific destination intent overrides the page intent.

Creation URLs carry only the existing allowed campaign/referral fields, validated intent, landing slug and landing path. Free text and arbitrary return parameters are discarded. Existing landing analytics data attributes and consent-controlled attribution capture remain in place. No cookies, GA identifiers or consent decisions are fabricated by these links.

## Regression checks

Isolated Jest suites cover all five supported locales; pending/signed-out/signed-in Clerk state; header and challenge context; custom destinations; allowlisted campaign/referral fields; unsafe redirects; first-lead and returning-lead behavior; signup/login switching; catalogue loading/failure/retry; valid/invalid package IDs; and one-time cart initialization under Strict Mode.

These tests mock network/Clerk dependencies and do not use the shared production database. They prove local behavior, not production payment or GA4 ingestion.
