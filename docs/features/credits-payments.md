# Credits & Payments

## Overview

Mythoria uses a credit-based economy for paid services such as e-books, printed books, and audiobook generation. Credits are purchased in bundles and spent when users trigger billable actions. This document outlines the user-facing experience, the pricing and checkout flow, and the supporting APIs and components.

## End-User Experience

### Pricing & Credit Bundles

- Users visit the Pricing page to compare service costs (e-book generation, printing, audiobook narration) and credit bundles.
- Each bundle highlights the best value, while FAQ sections clarify common questions.

### Buying Credits

- The Buy Credits page opens a cart experience where users can add or remove bundles, view subtotals, VAT, and the total.
- Promotion codes can be applied to add bonus credits to the user's balance; they do not currently change cart pricing.
- Users can enter optional billing details in the checkout UI, but the current flow keeps them client-side and does not persist them through a dedicated billing API.
- A payment method is selected (Revolut Pay or MB Way), and the order is placed without leaving the flow.

### Credit Usage

- When a paid action is triggered (e.g., audiobook generation), the system checks the credit balance and blocks the action if credits are insufficient.
- Successful actions immediately deduct credits and update the visible balance.

## Implementation Details (Developer View)

### Pricing & Marketing Surfaces

- Pricing data is loaded from `/api/pricing/services` and `/api/pricing/credit-packages` and rendered in `src/app/[locale]/pricing/page.tsx` alongside FAQ content.
- Bundles and services are mapped to the `pricingService` and exposed by the `/api/pricing` endpoint for other screens.

### Checkout Flow

- `src/app/[locale]/buy-credits/page.tsx` manages the buy flow shell and handles querystring callbacks after payment redirects.
- `src/components/CartView.tsx` and `useCart` maintain cart state, subtotal, VAT, and total calculations. The current checkout math shows VAT using a 6% split in the page logic.
- `src/components/PromotionCodeRedeemer.tsx` posts to `/api/codes/redeem` to validate promo codes and apply bonuses.
- `src/components/BillingInformation.tsx` collects optional billing details locally in the checkout UI. There is no dedicated `/api/billing` route in the current implementation.
- `src/components/PaymentSelector.tsx` allows users to choose Revolut Pay or MB Way.
- Revolut Pay is handled by `src/components/RevolutPayment.tsx`, which initializes `@revolut/checkout` via `/api/revolut-config` and handles the widget callbacks.
- MB Way checkout calls `/api/payments/mbway`, creates an admin ticket workflow, then displays a modal with payment instructions.

### Credit Ledger & Enforcement

- Credit balances are fetched from `/api/my-credits` and displayed through `src/components/CreditsDisplay.tsx`.
- Billable events (e.g., audiobook generation, self-print, print requests, and AI edits) verify pricing or route-level cost logic, check balances with `creditService.getAuthorCreditBalance`, and deduct credits with `creditService.deductCredits`.
- Revolut order creation happens through `/api/payments/order`, which stores the pending order and returns the provider token. Credits are granted after successful webhook completion.

### Relevant API Endpoints

- `GET /api/pricing` and `GET /api/pricing/*` - pricing and package listings.
- `POST /api/payments/order` - create a Revolut order and receive a payment token.
- `POST /api/payments/mbway` - create an MB Way payment request and admin ticket workflow.
- `POST /api/codes/redeem` - validate promo codes.
- `GET /api/my-credits` - credit balance and history.

```mermaid
flowchart TD
    PricingServices[/api/pricing/services] --> PricingPage
    PricingPackages[/api/pricing/credit-packages] --> PricingPage
    PricingPage --> BuyCredits
    BuyCredits --> CartView
    CartView --> RevolutAPI[/api/payments/order]
    CartView --> MbwayAPI[/api/payments/mbway]
    RevolutAPI --> RevolutWidget
    MbwayAPI --> MbwayModal
    PromoCodes[PromotionCodeRedeemer] -->|POST| CodesAPI[/api/codes/redeem]
```
