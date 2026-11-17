import type { WebsiteTheme } from './websiteTheme';
import christmas from '../../public/homepage/christmas/assets_metadata.json';

export const HOMEPAGE_ASSET_BASE = '/homepage/kids_fantasy';
export const homepageAsset = (file: string): string => `${HOMEPAGE_ASSET_BASE}/${file}`;

const christmasArtwork = new Map(
  christmas.assets.map(({ file }) => [homepageAsset(file), `/homepage/christmas/${file}`]),
);

// Shared page illustrations outside the homepage manifest have their own original canvases.
for (const file of [
  'partners_page',
  'open-book-with-stars',
  'Color_pallete',
  'fa-gift-papercut',
  'fa-user-papercut',
  'fa-rocket-papercut',
  'openBook',
  'sparkles',
  'characters',
]) {
  christmasArtwork.set(`/Papercut_icons/${file}.webp`, `/themes/christmas/icons/${file}.webp`);
}
for (const file of ['sparkle_a', 'sparkle_b', 'sparkle_c', 'cloud_right']) {
  christmasArtwork.set(`/Papercut_icons/${file}.webp`, `/homepage/christmas/${file}.webp`);
}

export function resolveWebsiteArtwork(src: string, theme: WebsiteTheme): string {
  return theme === 'christmas' ? (christmasArtwork.get(src) ?? src) : src;
}

export function resolveMobileWebsiteArtwork(src: string, theme: WebsiteTheme) {
  if (theme !== 'christmas' || src !== homepageAsset('footer.webp')) return;
  const mobile = christmas.assets.find(
    (asset) => asset.slot === 'footer_bg' && asset.device === 'mobile',
  );
  if (mobile)
    return {
      src: `/homepage/christmas/${mobile.file}`,
      width: mobile.dimensions.w,
      height: mobile.dimensions.h,
    };
}
