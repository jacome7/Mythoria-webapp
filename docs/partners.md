# Partners Directory

## Overview
The Partners Directory exposes a public list of Mythoria partners, currently scoped to **printer** partners, with filtering and infinite scroll. The marketing partnerships page remains at `/[locale]/partners`, while the listing lives at `/[locale]/partners/printers`.

## Routes & UI
- **Marketing page**: `/[locale]/partners` (existing CTA form and partnership info).
- **Printers list**: `/[locale]/partners/printers` (new page).

The printers page renders `PartnersPrintersPageContent` to provide:
- **Location filters**: Country and city/region dropdowns, prepopulated with European cities.
- **Infinite scroll**: Load-more on scroll (IntersectionObserver) plus a manual “Load more” button.
- **Partner cards**: Name, logo (with placeholder fallback), short description, and location.
- **Details modal**: Name, logo, email, mobile phone, and full address.

### Key files
- Page: `src/app/[locale]/partners/printers/page.tsx`
- Client UI: `src/components/PartnersPrintersPageContent.tsx`
- Placeholder logo: `public/partners/partner-placeholder.svg`

## API
Public endpoint used by the printers page:
- `GET /api/partners/printers`

### Query parameters
- `limit` (default: 10, max: 50)
- `offset` (default: 0)
- `countryCode` (optional, ISO-3166-1 alpha-2)
- `city` (optional, free-text match)
- `locale` (optional, used to pick localized short description)

### Response
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid",
      "name": "Partner Name",
      "type": "printer",
      "logoUrl": "https://...",
      "websiteUrl": null,
      "email": null,
      "mobilePhone": null,
      "addressLine1": null,
      "addressLine2": null,
      "city": null,
      "postalCode": null,
      "countryCode": null,
      "shortDescription": "Localized short description",
      "serviceScope": null,
      "displayOrder": 1
    }
  ],
  "nextOffset": 10,
  "hasMore": true
}
```

## Database
### Table: `partners`
Stored in the primary PostgreSQL database and mapped via Drizzle.

Columns (highlights):
- `id` (uuid, PK)
- `name` (text)
- `type` (enum: printer | attraction | retail | other)
- `logo_url` (text)
- `website_url` (text, nullable)
- `email` (text, nullable)
- `mobile_phone` (varchar, nullable)
- `address_line1`, `address_line2`, `city`, `postal_code`, `country_code`
- `short_description` (jsonb, must include per-locale keys and `default`)
- `service_scope` (enum: local | national | international; nullable for non-printers)
- `status` (enum: active | draft | hidden)
- `display_order` (int, nullable)
- `created_at` (timestamptz)

Enums are defined in `src/db/schema/enums.ts` and the table is in `src/db/schema/partners.ts`.

### Listing query
The public listing uses:
```
WHERE status = 'active'
  AND type = 'printer'
ORDER BY display_order NULLS LAST, name ASC
```

### Migrations
- `drizzle/0024_handy_husk.sql`
- `drizzle/meta/0024_snapshot.json`

## Localization
`short_description` is stored as JSON with a key per locale plus a `default` key. The service resolves text in this order:
1. Requested locale
2. `default`
3. Default locale from `routing.defaultLocale`
4. `en-US`
5. First available value

UI copy lives in `src/messages/*/PartnersList.json` and is registered in `src/i18n/request.ts`.

## Notes for future expansion
- Add additional filters (service scope, partner type) to the API and UI.
- Expand dropdown data to more regions and/or derive options from partner data.
- Add a separate list page for attractions/retail partners when ready.
