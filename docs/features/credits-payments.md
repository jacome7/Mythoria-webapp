# Credits & Payments

## Overview

Mythoria uses a credit-based economy for paid services such as e-books, printed books, audiobook generation, and AI-assisted editing. Credits are purchased in bundles and spent when users trigger billable actions.

## End-User Experience

### Pricing & Credit Bundles

- Users visit the Pricing page to compare service costs and credit bundles.
- Each bundle highlights the best value, while FAQ sections clarify common questions.

### Buying Credits

- The Buy Credits page opens a cart experience where users can add or remove bundles, view subtotal/VAT/total, and redeem promo codes.
- Promotion codes can add bonus credits to the user's balance; they do not currently change cart pricing.
- Stripe Hosted Checkout is the only customer-facing checkout path for cards, wallets, MB WAY, billing details, tax ID collection, automatic tax, and invoices.
- Public credit prices remain EUR tax-inclusive. Stripe Tax and the final Stripe invoice are the tax source of truth.

### Credit Usage

- When a paid action is triggered, the system checks the credit balance and blocks the action if credits are insufficient.
- Successful actions immediately deduct credits and update the visible balance.

## Implementation Details

### Pricing & Marketing Surfaces

- Pricing data is loaded from `/api/pricing/services` and `/api/pricing/credit-packages` and rendered in `src/app/[locale]/pricing/page.tsx` alongside FAQ content.
- Bundles and services are mapped to the `pricingService` and exposed by the `/api/pricing` endpoint for other screens.

### Checkout Flow

- `src/app/[locale]/buy-credits/page.tsx` manages the buy flow shell and handles querystring callbacks after Stripe redirects.
- `src/components/CartView.tsx` and `useCart` maintain cart state, subtotal, VAT, and total calculations.
- `src/components/PromotionCodeRedeemer.tsx` posts to `/api/codes/redeem` to validate promo codes and apply bonuses.
- `src/components/PaymentSelector.tsx` presents the single Stripe Checkout path with card, wallet, and MB WAY affordances.
- `POST /api/payments/stripe/checkout` validates credit packages server-side, creates a pending `payment_orders` row, creates or reuses a Stripe Customer, and returns a hosted Checkout URL.
- Stripe Checkout Sessions use automatic billing address collection, phone collection, tax ID collection, `automatic_tax`, invoice creation, and tax-inclusive EUR line items. Stripe only asks for address fields when needed for tax, invoice, payment method, or risk checks.
- Stripe Checkout receives a locale mapped from the current Mythoria route locale, such as `fr-FR` to Stripe `fr`.
- `POST /api/payments/stripe/webhook` verifies Stripe signatures and fulfills completed Checkout Sessions. Credits are granted only from verified Stripe webhooks.
- `GET /api/payments/stripe/session` lets the Buy Credits page poll the local order after returning from Stripe while webhook fulfillment finalizes credits.

### Credit Ledger & Enforcement

- Credit balances are fetched from `/api/my-credits` and displayed through `src/components/CreditsDisplay.tsx`.
- Billable events verify pricing or route-level cost logic, check balances with `creditService.getAuthorCreditBalance`, and deduct credits with `creditService.deductCredits`.
- Stripe order creation stores pending `payment_orders`. Credit fulfillment is idempotent and only transitions an order to completed once.
- Stripe order metadata stores invoice IDs, hosted invoice URLs, invoice PDF URLs, payment intent IDs, payment method type, and customer details when Stripe provides them.

### Relevant API Endpoints

- `GET /api/pricing` and `GET /api/pricing/*` - pricing and package listings.
- `POST /api/payments/stripe/checkout` - create a Stripe Hosted Checkout Session for selected credit packages.
- `POST /api/payments/stripe/webhook` - verify Stripe signatures and fulfill completed Checkout Sessions.
- `GET /api/payments/stripe/session` - return the authenticated user's local order status after Stripe redirects back.
- `POST /api/codes/redeem` - validate promo codes.
- `GET /api/my-credits` - credit balance and history.

```mermaid
flowchart TD
    PricingServices[/api/pricing/services] --> PricingPage
    PricingPackages[/api/pricing/credit-packages] --> PricingPage
    PricingPage --> BuyCredits
    BuyCredits --> CartView
    CartView --> StripeCheckout[/api/payments/stripe/checkout]
    StripeCheckout --> StripeHosted[Stripe Hosted Checkout]
    StripeHosted --> StripeWebhook[/api/payments/stripe/webhook]
    StripeWebhook --> Credits[Credit fulfillment]
    PromoCodes[PromotionCodeRedeemer] -->|POST| CodesAPI[/api/codes/redeem]
```
