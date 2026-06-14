import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import LandingPageTemplate from '@/components/landing-pages/LandingPageTemplate';
import { getLandingPageBySlug, getLandingPageStaticParams } from '@/content/landing-pages';
import { routing } from '@/i18n/routing';
import { buildAbsoluteUrl, buildLocalizedPath, buildLocalizedUrl } from '@/lib/seo';

interface LandingPageRouteProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export function generateStaticParams() {
  return getLandingPageStaticParams();
}

export async function generateMetadata({ params }: LandingPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getLandingPageBySlug(slug);

  if (!page) {
    return {
      title: 'Not Found',
      robots: 'noindex,nofollow',
    };
  }

  const canonicalUrl = buildLocalizedUrl(page.locale, `/lp/${page.slug}`);
  const imageUrl = buildAbsoluteUrl(page.ogImageSrc ?? page.hero.imageSrc);

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    robots: page.indexable
      ? 'index,follow,max-snippet:-1,max-image-preview:large'
      : 'noindex,nofollow',
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      type: 'website',
      url: canonicalUrl,
      locale: page.locale,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: page.hero.imageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metaTitle,
      description: page.metaDescription,
      images: [imageUrl],
    },
  };
}

export default async function LandingPageRoute({ params }: LandingPageRouteProps) {
  const { locale, slug } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);

  const page = getLandingPageBySlug(slug);

  if (!page) {
    notFound();
  }

  if (page.locale !== locale) {
    permanentRedirect(buildLocalizedPath(page.locale, `/lp/${page.slug}`));
  }

  return <LandingPageTemplate page={page} />;
}
