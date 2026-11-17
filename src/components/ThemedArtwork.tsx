'use client';

import Image, { getImageProps, type ImageProps } from 'next/image';
import { useHomepageTheme } from '@/hooks/useHomepageTheme';
import { resolveMobileWebsiteArtwork, resolveWebsiteArtwork } from '@/constants/homepageAssets';

/** Applies the active edition to editorial decorations at their original intrinsic size. */
export default function ThemedArtwork({
  src,
  alt,
  ...props
}: Omit<ImageProps, 'src'> & { src: string }) {
  const theme = useHomepageTheme();
  const image = <Image {...props} alt={alt} src={resolveWebsiteArtwork(src, theme)} />;
  const mobile = resolveMobileWebsiteArtwork(src, theme);
  if (!mobile) return image;

  const { props: source } = getImageProps({ ...props, ...mobile, alt });
  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={source.srcSet} sizes={source.sizes} />
      {image}
    </picture>
  );
}
