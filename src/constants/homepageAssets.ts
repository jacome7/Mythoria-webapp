/**
 * Homepage asset resolution for sections OUTSIDE the paper-cut hero
 * (Footer, Header, HowItWorks, WhyChooseMythoria, HomepageCta, QuoteOfTheDay,
 * StoryCounter, aboutUs). These sections are brand chrome and are not
 * intent-skinned (yet) — they always use the default folder.
 *
 * Asset files use role-based names shared across every intent folder
 * (see public/homepage/<intent>/assets_metadata.json). If a future intent
 * needs skinned sections, add `assetBase` + `providedAssets` to
 * PaperCutComposition and resolve against the active composition here.
 */
export const HOMEPAGE_ASSET_BASE = '/homepage/kids_fantasy';

export const homepageAsset = (file: string): string => `${HOMEPAGE_ASSET_BASE}/${file}`;
