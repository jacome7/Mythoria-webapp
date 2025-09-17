# Credit Economy & Checkout

## Mythoria's Take
Credits are the stardust that fuel every illustration, translation, and print run. The pricing hall lays out exactly what each service costs, bundles credits into tidy packages, and answers the big questions before you spend a coin. When it is time to top up, the cart keeps totals straight, promo codes drop bonuses on the fly, and you can choose between Revolut Pay or MB Way without breaking flow.

## Technical Deep Dive
- Pricing showcase: `src/app/[locale]/pricing/page.tsx` fetches `/api/pricing/services` and `/api/pricing/credit-packages`, renders service cost tables, highlights best-value bundles, and provides FAQ accordions with localized copy.
- Buy flow shell: `src/app/[locale]/buy-credits/page.tsx` loads search params, wires Clerk state, and wraps the Suspense-friendly `BuyCreditsContent` so querystring callbacks (e.g., Revolut) feel native.
- Cart mechanics: `src/components/CartView.tsx` and `useCart` track item quantities, subtotal, VAT, and totals, while `PromotionCodeRedeemer` posts to `/api/codes/redeem` and surfaces instant feedback.
- Billing data: `src/components/BillingInformation.tsx` persists customer details, VAT numbers, and invoice preferences by calling `/api/billing` endpoints.
- Payment selection: `src/components/PaymentSelector.tsx` toggles between Revolut Pay and MB Way; once a payment method is chosen, `handlePlaceOrder` in the page creates an order via `/api/orders` and stores the returned token.
- Revolut integration: `src/components/RevolutPayment.tsx` pulls public keys from `/api/revolut-config`, initialises `@revolut/checkout`, mounts the payment widget, and watches for success/error/cancel callbacks to update order status.
- MB Way experience: `MbwayPaymentModal` displays human-readable instructions and cleans up the cart once the modal closes.

```mermaid
flowchart TD
    Packages[/api/pricing/credit-packages] --> PricingPage
    Services[/api/pricing/services] --> PricingPage
    PricingPage --> BuyCredits
    BuyCredits --> CartView
    CartView --> OrderAPI[/api/orders]
    OrderAPI --> RevolutWidget & MbwayModal
    Promo[PromotionCodeRedeemer] -->|POST| CodesAPI[/api/codes/redeem]
```
