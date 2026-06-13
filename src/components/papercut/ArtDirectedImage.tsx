import { getImageProps } from 'next/image';
import type { ResolvedAsset } from './heroManifest';

/**
 * Art-directed responsive image: serves the `mobile` asset below 768px and the
 * `desktop` (laptop) asset from 768px up, via `<picture>` + next/image's
 * `getImageProps`. Browsers download only the matching source — unlike
 * rendering two `next/image`s toggled with CSS, which fetches both.
 *
 * Locale fallback happens earlier, in `resolveAsset` (heroManifest.ts) — by the
 * time this renders, both assets are concrete build-time-known files.
 */
export default function ArtDirectedImage({
  mobile,
  desktop,
  alt = '',
  priority = false,
  quality = 75,
  className,
  imgClassName,
}: {
  mobile: ResolvedAsset;
  desktop: ResolvedAsset;
  /** Decorative scenery by default (alt=''). */
  alt?: string;
  /** Set on the LCP candidate (the scene background). */
  priority?: boolean;
  quality?: number;
  className?: string;
  imgClassName?: string;
}) {
  const common = { alt, sizes: '100vw', quality, priority } as const;
  const {
    props: { srcSet: mobileSrcSet },
  } = getImageProps({ ...common, src: mobile.src, width: mobile.w, height: mobile.h });
  const { props: desktopProps } = getImageProps({
    ...common,
    src: desktop.src,
    width: desktop.w,
    height: desktop.h,
  });

  return (
    <picture className={className}>
      <source media="(max-width: 767px)" srcSet={mobileSrcSet} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes via desktopProps */}
      <img
        {...desktopProps}
        fetchPriority={priority ? 'high' : undefined}
        className={imgClassName}
      />
    </picture>
  );
}
