'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';

export const BLOG_FALLBACK_IMAGE = '/images/logo/papercut.jpg';

export default function BlogImage({
  src,
  alt,
  ...props
}: Omit<ImageProps, 'src'> & { src: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageSrc = failedSrc === src ? BLOG_FALLBACK_IMAGE : src;

  return (
    <Image
      {...props}
      src={imageSrc}
      alt={alt}
      unoptimized={imageSrc.startsWith('http')}
      onError={() => {
        if (imageSrc !== BLOG_FALLBACK_IMAGE) setFailedSrc(src);
      }}
    />
  );
}
