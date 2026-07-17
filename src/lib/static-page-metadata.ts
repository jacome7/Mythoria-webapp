import { Metadata } from 'next';
import { routing } from '@/i18n/routing';
import { buildLocalizedUrl } from '@/lib/seo';

interface StaticPageMetadataOptions {
  locale: string;
  path: string;
  title: string;
  description?: string;
}

export function buildStaticPageMetadata({
  locale,
  path,
  title,
  description,
}: StaticPageMetadataOptions): Metadata {
  const canonical = buildLocalizedUrl(locale, path);
  const languages = Object.fromEntries(
    routing.locales.map((supportedLocale) => [
      supportedLocale,
      buildLocalizedUrl(supportedLocale, path),
    ]),
  );

  if (path === '' || path === '/') {
    languages['x-default'] = buildLocalizedUrl(routing.defaultLocale);
  }

  return {
    title,
    ...(description ? { description } : {}),
    robots: 'index,follow,max-snippet:-1,max-image-preview:large',
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      ...(description ? { description } : {}),
      type: 'website',
      url: canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      ...(description ? { description } : {}),
    },
  };
}
