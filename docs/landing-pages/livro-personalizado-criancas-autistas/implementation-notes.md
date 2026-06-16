# Implementation Notes

## Status

Draft proposal only. Do not publish, index, route, add navigation, update sitemap, or generate final media until human review is complete.

## Intent metadata

- `primaryIntent`: `personalised_autism_stories`
- `mappedExistingIntent`: `null`
- Assumption: no canonical existing Mythoria intent token was confirmed during proposal generation. Map this later if the web app or SGW exposes a stable intent registry.

## Style source

Graphical styles were selected from the Story Generation Workflow canonical image-style set:

- `watercolor`
- `colored_pencil`
- `digital_art`
- `hand_drawn`
- `pixar_style`

Novel styles were selected from the Drizzle enum values:

- `educational`
- `fantasy`
- `contemporary`

## Safety and approval

This page is `yellow` risk because it involves children and neurodivergence. Keep `requiresHumanApproval: true`. External expert review is not mandatory for this draft, but should be considered if the page copy becomes more educational or advisory.

## Tracking recommendations

Recommended events:

- `landing_page_view`
- `landing_primary_cta_click`
- `landing_secondary_cta_click`
- `landing_sample_book_click`
- `landing_account_created`
- `landing_story_started`
- `landing_story_completed`
- `landing_credit_purchase`

Recommended event properties:

```json
{
  "landingSlug": "livro-personalizado-criancas-autistas",
  "primaryIntent": "personalised_autism_stories",
  "niche": "livros personalizados para crianças autistas",
  "locale": "pt-PT",
  "riskRating": "yellow",
  "persona": "",
  "recipientType": "",
  "sampleBookId": "",
  "ctaVariant": ""
}
```

Primary success metrics:

1. First story completed.
2. Account creation.
3. Story start rate.
4. Sample-book engagement.
5. Paid credit purchase.

## Future implementation notes

- Render this as `/pt-PT/lp/livro-personalizado-criancas-autistas` only after approval.
- Keep FAQ schema limited to visible FAQ copy.
- Do not create near-duplicate pages for every autism-related keyword variation.
- Public sample stories should be generated separately, manually reviewed, then linked after approval.
