# Print Keepsake Shop

## Mythoria's Take

When a story deserves paper and ink, the Print Keepsake Shop walks you from proud author to package-at-the-door. Preview the finished book, confirm the shipping address, choose softcover or hardcover bundles, and see the credit tally update before you commit. MB Way fans even get a dedicated checkout path, because great tales should travel anywhere.

## Technical Deep Dive

- Entry route: `src/app/[locale]/stories/print/[storyId]/page.tsx` guards access with Clerk and lazy-loads the print workflow.
- Wizard core: `src/components/print-order/PrintOrderContent.tsx` coordinates the three steps (story, address, payment), fetching story metadata (`/api/stories/{id}`) and address books (`/api/addresses`).
- Story preview: `steps/StoryStep.tsx` renders synopsis and cover imagery with defensive fallbacks.
- Address management: `steps/AddressStep.tsx` embeds `AddressCard`, enabling create/edit/delete with `/api/addresses` plus auto-selection of the newest entry.
- Payment orchestration: `steps/PaymentStep.tsx` loads active print services from `/api/pricing/services`, calculates extra chapter surcharges, checks user credits (`/api/my-credits`), and provides CTAs to the pricing page when balances are low.
- Order confirmation: `handlePlaceOrder` in `PrintOrderContent` composes the payload for `/api/print-orders`, applies credit deductions, and surfaces toast notifications on success.
- Alternate payment: `src/components/MbwayPaymentModal.tsx` presents MB Way instructions (including dynamic codes returned by the order API) for manual completion.

```mermaid
stateDiagram-v2
    [*] --> StoryReview
    StoryReview --> Address
    Address --> Payment
    Payment --> Confirmation
    Confirmation --> [*]
    note right of Payment
      Credits validated
      before order POST
    end note
```
