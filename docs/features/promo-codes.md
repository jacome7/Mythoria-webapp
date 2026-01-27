# Promo Codes

## Overview

Promo codes (sometimes called vouchers) grant one-time or limited credit bonuses to signed-in users. Users enter a short code (for example, `PARTNER10`), and the system validates it, grants credits immediately, and records a redemption entry for auditing and reporting. Promo codes are created, updated, and deleted in the **`mythoria_admin`** administration portal (this application only redeems them).

## End‑User Experience

### Where users can redeem a code

Promo code entry is available in two places:

1. **Buy Credits page** (`/buy-credits`)
   - Section label: “Promo or referral code”.
   - The form expands when the user clicks “Have a code?”.
2. **Onboarding profile page** (`/profile/onboarding`)
   - A compact card labeled “Promo or referral code”.

### What the user sees and does

1. Click **Have a code?** to reveal the input.
2. Enter the code and click **Apply**.
3. The UI displays **Checking...** while the request is sent.
4. If the code is valid, the UI shows a success message with the credits granted.
5. If anything is wrong (invalid, inactive, expired, limit reached, etc.), the UI shows a single generic error: **“Invalid or inactive code.”**

Notes for user-facing behavior:

- Codes are case-insensitive. The backend normalizes them to uppercase before lookup.
- After a success, the input is disabled to prevent resubmission.
- The UI does not reveal why a code failed; all failure states map to a single message.

## API Contract

### `POST /api/codes/redeem`

- **Authentication required**. Unauthenticated requests return `401` with `auth_required`.
- Request body:

```json
{ "code": "PARTNER10" }
```

- Success response (`200`):

```json
{
  "code": "PARTNER10",
  "creditsGranted": 10,
  "newBalance": 125
}
```

- Error response (`400`):

```json
{ "error": { "code": "invalid_code", "message": "Invalid or inactive code." } }
```

The API intentionally avoids localized success messages. The client localizes the response using the `Voucher` translation keys.

## Database Storage

Promo code data is stored in PostgreSQL via Drizzle ORM. The schema lives in `src/db/schema/promotion-codes.ts`.

### Table: `promotion_codes`

| Column                      | Type                 | Notes                                                                           |
| --------------------------- | -------------------- | ------------------------------------------------------------------------------- |
| `promotion_code_id`         | `uuid` (PK)          | Primary key.                                                                    |
| `code`                      | `varchar(64)`        | Unique; stored uppercase.                                                       |
| `type`                      | `varchar(20)`        | Defaults to `partner`; reserved for future types (e.g., `referral`, `book_qr`). |
| `credit_amount`             | `integer`            | Credits granted per redemption.                                                 |
| `max_global_redemptions`    | `integer` (nullable) | Total global cap; null = unlimited.                                             |
| `max_redemptions_per_user`  | `integer`            | Default `1` per user.                                                           |
| `valid_from`                | `timestamp` (tz)     | Optional start time.                                                            |
| `valid_until`               | `timestamp` (tz)     | Optional end time.                                                              |
| `referrer_author_id`        | `uuid` (nullable)    | Reserved for referral workflows; currently unused.                              |
| `metadata`                  | `jsonb` (nullable)   | Optional extra data from admin portal.                                          |
| `created_at` / `updated_at` | `timestamp` (tz)     | Audit timestamps.                                                               |
| `active`                    | `boolean`            | Default `true`; used for soft deactivation.                                     |

### Table: `promotion_code_redemptions`

| Column                         | Type              | Notes                                             |
| ------------------------------ | ----------------- | ------------------------------------------------- |
| `promotion_code_redemption_id` | `uuid` (PK)       | Primary key.                                      |
| `promotion_code_id`            | `uuid` (FK)       | References `promotion_codes` (cascade on delete). |
| `author_id`                    | `uuid` (FK)       | Redeeming user (cascade on delete).               |
| `redeemed_at`                  | `timestamp` (tz)  | Default now.                                      |
| `credits_granted`              | `integer`         | Credits applied for this redemption.              |
| `credit_ledger_entry_id`       | `uuid` (nullable) | Optional link to `credit_ledger` entry.           |

**Indexes**

- `promotion_code_redemptions_code_idx` on `promotion_code_id`.
- `promotion_code_redemptions_author_idx` on `author_id`.

## Implementation Details (Developer Notes)

### UI components

- **`PromotionCodeRedeemer`** (`src/components/PromotionCodeRedeemer.tsx`)
  - Client component with states: `idle`, `loading`, `success`, `error`.
  - Hidden by default; expanded by clicking “Have a code?”.
  - Calls `POST /api/codes/redeem` with `{ code }`.
  - On success, uses `Voucher.success` translation with `{ credits, code }`.
  - Disables input and button after a successful redemption.

- **Integration points**
  - Buy Credits page (`src/app/[locale]/buy-credits/page.tsx`).
  - Onboarding profile page (`src/app/[locale]/profile/onboarding/page.tsx`).

### Server flow

- **API route**: `src/app/api/codes/redeem/route.ts`
  1. Reads the current signed-in author (`getCurrentAuthor`).
  2. Extracts `code` from the JSON body.
  3. Calls `promotionCodeService.redeem(authorId, code)`.
  4. Returns a **generic invalid** error for any failure.

### Business logic

- **Service**: `promotionCodeService.redeem` in `src/db/services.ts`.

Validation steps (all failures map to `invalid_code`):

1. `code.trim().toUpperCase()`; reject empty.
2. Fetch `promotion_codes` row; reject if missing or inactive.
3. Enforce `valid_from` / `valid_until` windows if present.
4. Enforce per-user limit via `COUNT(*)` on `promotion_code_redemptions`.
5. Enforce global limit via `COUNT(*)` on `promotion_code_redemptions` (if `max_global_redemptions` is set).
6. Reject if `credit_amount <= 0`.

If valid:

1. Credits are granted immediately using `creditService.addCredits(authorId, amount, 'voucher')`.
2. A redemption row is inserted into `promotion_code_redemptions`.
3. The response includes `creditsGranted` and the updated balance.

### Credit ledger integration

- Promo code credits are recorded as the **`voucher`** event type in the credit ledger. The credit history UI displays this event type using the `CreditsDisplay` translation keys.

## Operational Notes

- **Admin management**: Promo codes are created, edited, and deleted in the `mythoria_admin` portal. This app assumes the codes already exist in the database and does not provide admin UI for managing them.
- **Error messaging**: All validation failures collapse to a single generic message to prevent code enumeration and keep the UX simple.
- **Extensibility**: The schema includes `type`, `referrer_author_id`, and `metadata` to support future referral or campaign logic. As of now, these fields are stored but not used in redemption logic.

## Testing Status

- A placeholder Jest test exists in `src/db/promotionCodeService.test.ts` with no full DB-backed coverage yet.
