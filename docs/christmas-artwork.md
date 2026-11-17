# Christmas artwork inventory

The Christmas edition uses generated WebP artwork. The first carousel slide shows Sara holding a localized Christmas book in all five supported languages. The two middle slides feature names on the covers, and the last slide features a family.

## Homepage and shared chrome

The original files are under `public/homepage/kids_fantasy/`. The Christmas files are under `public/homepage/christmas/`. When Kids uses the English fallback for a carousel slot, the localized Christmas image uses that fallback canvas. The mobile footer adds a separately composed crop.

| Original                                       | Christmas                                      | Christmas canvas | Alpha |
| ---------------------------------------------- | ---------------------------------------------- | ---------------- | ----- |
| `sky_left.webp`                                | `sky_left.webp`                                | 300 × 465        | Yes   |
| `sky_right.webp`                               | `sky_right.webp`                               | 381 × 418        | Yes   |
| `cloud_left.webp`                              | `cloud_left.webp`                              | 460 × 350        | Yes   |
| `cloud_right.webp`                             | `cloud_right.webp`                             | 489 × 317        | Yes   |
| `sparkles.webp`                                | `sparkles.webp`                                | 328 × 318        | Yes   |
| `background_laptop.webp`                       | `background_laptop.webp`                       | 3840 × 2160      | Yes   |
| `background_mobile.webp`                       | `background_mobile.webp`                       | 3840 × 2160      | Yes   |
| `foreground_laptop.webp`                       | `foreground_laptop.webp`                       | 1920 × 1072      | Yes   |
| `foreground_mobile.webp`                       | `foreground_mobile.webp`                       | 1080 × 1072      | Yes   |
| `person1_en-US.webp`                           | `person1_en-US.webp`                           | 665 × 1024       | Yes   |
| `person1_es-ES.webp`                           | `person1_es-ES.webp`                           | 572 × 1024       | Yes   |
| `person1_fr-FR.webp`                           | `person1_fr-FR.webp`                           | 572 × 1024       | Yes   |
| `person1_pt-PT.webp`                           | `person1_pt-PT.webp`                           | 461 × 717        | Yes   |
| `person2_en-US.webp`                           | `person2_en-US.webp`                           | 572 × 1024       | Yes   |
| `person2_es-ES.webp`                           | `person2_es-ES.webp`                           | 572 × 1024       | Yes   |
| `person2_fr-FR.webp`                           | `person2_fr-FR.webp`                           | 572 × 1024       | Yes   |
| `person2_pt-PT.webp`                           | `person2_pt-PT.webp`                           | 572 × 1024       | Yes   |
| `person3_pt-PT.webp`                           | `person3_pt-PT.webp`                           | 540 × 717        | Yes   |
| `person3_en-US.webp`                           | `person3_en-US.webp`                           | 539 × 717        | Yes   |
| `person3_es-ES.webp`                           | `person3_es-ES.webp`                           | 539 × 717        | Yes   |
| `person4_en-US.webp`                           | `person4_en-US.webp`                           | 607 × 750        | Yes   |
| `person4_es-ES.webp`                           | `person4_es-ES.webp`                           | 606 × 750        | Yes   |
| `person4_fr-FR.webp`                           | `person4_fr-FR.webp`                           | 606 × 750        | Yes   |
| `person4_pt-PT.webp`                           | `person4_pt-PT.webp`                           | 606 × 750        | Yes   |
| `icon1.webp`                                   | `icon1.webp`                                   | 160 × 135        | Yes   |
| `icon2.webp`                                   | `icon2.webp`                                   | 160 × 136        | Yes   |
| `icon3.webp`                                   | `icon3.webp`                                   | 160 × 119        | Yes   |
| `button.webp`                                  | `button.webp`                                  | 512 × 136        | Yes   |
| `footer.webp`                                  | `footer.webp`                                  | 1920 × 373       | Yes   |
| `sparkle_a.webp`                               | `sparkle_a.webp`                               | 128 × 134        | Yes   |
| `sparkle_b.webp`                               | `sparkle_b.webp`                               | 128 × 136        | Yes   |
| `sparkle_c.webp`                               | `sparkle_c.webp`                               | 128 × 127        | Yes   |
| `sparkle_round.webp`                           | `sparkle_round.webp`                           | 90 × 92          | Yes   |
| `cloud_small.webp`                             | `cloud_small.webp`                             | 200 × 135        | Yes   |
| `cta_decor_left.webp`                          | `cta_decor_left.webp`                          | 256 × 275        | Yes   |
| `cta_decor_right.webp`                         | `cta_decor_right.webp`                         | 256 × 316        | Yes   |
| `number_of_stories_icon.webp`                  | `number_of_stories_icon.webp`                  | 128 × 163        | Yes   |
| `howitworks_step1_icon.webp`                   | `howitworks_step1_icon.webp`                   | 234 × 268        | Yes   |
| `howitworks_step2_icon.webp`                   | `howitworks_step2_icon.webp`                   | 292 × 243        | Yes   |
| `howitworks_step3_icon.webp`                   | `howitworks_step3_icon.webp`                   | 237 × 252        | Yes   |
| `howitworks_step4_icon.webp`                   | `howitworks_step4_icon.webp`                   | 293 × 286        | Yes   |
| `howitworks_step5_icon.webp`                   | `howitworks_step5_icon.webp`                   | 267 × 235        | Yes   |
| `howitworks_step6_icon.webp`                   | `howitworks_step6_icon.webp`                   | 207 × 242        | Yes   |
| `highlights_your_own_story_icon.webp`          | `highlights_your_own_story_icon.webp`          | 160 × 201        | Yes   |
| `highlights_from_idea_to_book_icon.webp`       | `highlights_from_idea_to_book_icon.webp`       | 160 × 207        | Yes   |
| `highlights_full_story_editing_icon.webp`      | `highlights_full_story_editing_icon.webp`      | 160 × 206        | Yes   |
| `highlights_gentle_credit_system_icon.webp`    | `highlights_gentle_credit_system_icon.webp`    | 160 × 168        | Yes   |
| `highlights_inspiration_on_tap_icon.webp`      | `highlights_inspiration_on_tap_icon.webp`      | 140 × 238        | Yes   |
| `highlights_made_for_every_audience_icon.webp` | `highlights_made_for_every_audience_icon.webp` | 160 × 148        | Yes   |
| `highlights_multiple_art_styles_icon.webp`     | `highlights_multiple_art_styles_icon.webp`     | 160 × 200        | Yes   |
| `highlights_private_by_default_icon.webp`      | `highlights_private_by_default_icon.webp`      | 160 × 226        | Yes   |
| `highlights_add_your_own_photos_icon.webp`     | `highlights_add_your_own_photos_icon.webp`     | 278 × 290        | Yes   |
| `person1_en-US.webp`                           | `person1_de-DE.webp`                           | 665 × 1024       | Yes   |
| `person2_en-US.webp`                           | `person2_de-DE.webp`                           | 572 × 1024       | Yes   |
| `person3_en-US.webp`                           | `person3_de-DE.webp`                           | 539 × 717        | Yes   |
| `person3_en-US.webp`                           | `person3_fr-FR.webp`                           | 539 × 717        | Yes   |
| `person4_en-US.webp`                           | `person4_de-DE.webp`                           | 607 × 750        | Yes   |
| `footer.webp`                                  | `footer_mobile.webp`                           | 780 × 520        | Yes   |

## Page illustrations

The original files are under `public/Papercut_icons/`. Sign-in, sign-up, partners, surveys, and story-creation screens use the applicable variants from `public/themes/christmas/icons/`.

| Original                    | Christmas                   | Christmas canvas | Alpha |
| --------------------------- | --------------------------- | ---------------- | ----- |
| `characters.webp`           | `characters.webp`           | 256 × 288        | Yes   |
| `Color_pallete.webp`        | `Color_pallete.webp`        | 256 × 241        | Yes   |
| `fa-gift-papercut.webp`     | `fa-gift-papercut.webp`     | 145 × 112        | Yes   |
| `fa-rocket-papercut.webp`   | `fa-rocket-papercut.webp`   | 132 × 166        | Yes   |
| `fa-user-papercut.webp`     | `fa-user-papercut.webp`     | 162 × 203        | Yes   |
| `open-book-with-stars.webp` | `open-book-with-stars.webp` | 512 × 247        | Yes   |
| `openBook.webp`             | `openBook.webp`             | 256 × 235        | Yes   |
| `partners_page.webp`        | `partners_page.webp`        | 512 × 520        | Yes   |
| `sparkles.webp`             | `sparkles.webp`             | 328 × 318        | Yes   |

The partners pages also use the homepage variants for `sparkle_a.webp`, `sparkle_b.webp`, `sparkle_c.webp` and `cloud_right.webp`. Social logos, the Mythoria wordmark, staff portraits, article and sample-book media, and customer content keep their original sources.

## Adding another edition

Register the campaign ID and its website theme resolver. Add a measured asset manifest and a hero composition with its copy, scene geometry and CTA intent. Register the edition in the hero registry and shared artwork resolver. Use the page-level theme attribute for scoped color or layout changes and the existing art-directed image component for responsive scenery. Run `npm run homepage:assets` and verify fresh, persisted, and campaign-entry sessions.
