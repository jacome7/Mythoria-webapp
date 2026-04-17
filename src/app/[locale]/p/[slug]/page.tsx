import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import PublicStoryPageClient from './PublicStoryPageClient';
import { toAbsoluteImageUrl } from '@/utils/image-url';
import { storyService } from '@/db/services';
import { normalizeLocale } from '@/utils/locale-utils';
import { buildLocalizedPath, buildLocalizedUrl } from '@/lib/seo';

const toAbsoluteOgUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://mythoria.pt${url.startsWith('/') ? '' : '/'}${url}`;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const story = await storyService.getPublicStorySeoData(slug);

  if (!story) {
    return {
      title: 'Mythoria | Personalized Books Creator',
      description: 'Turn your ideas into personalized, beautifully illustrated books with AI.',
      robots: 'noindex,nofollow',
      openGraph: {
        title: 'Mythoria | Personalized Books Creator',
        description: 'Turn your ideas into personalized, beautifully illustrated books with AI.',
        url: buildLocalizedUrl(locale, `/p/${slug}`),
        type: 'website',
        images: [
          {
            url: 'https://mythoria.pt/Mythoria-logo-white-512x336.jpg',
            width: 1200,
            height: 630,
            alt: 'Mythoria - Personalized Books Creator',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Mythoria | Personalized Books Creator',
        description: 'Turn your ideas into personalized, beautifully illustrated books with AI.',
        images: ['https://mythoria.pt/Mythoria-logo-white-512x336.jpg'],
      },
    };
  }

  const canonicalLocale = normalizeLocale(story.storyLanguage);
  const canonicalUrl = buildLocalizedUrl(canonicalLocale, `/p/${slug}`);
  const ogTitle = `Mythoria | ${story.title}`;
  const ogDescription =
    story.synopsis || story.plotDescription || `Read "${story.title}" on Mythoria.`;
  const coverUrl = toAbsoluteOgUrl(toAbsoluteImageUrl(story.coverUri) || undefined);

  return {
    title: ogTitle,
    description: ogDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: canonicalUrl,
      type: 'article',
      images: coverUrl
        ? [
            {
              url: coverUrl,
              width: 1200,
              height: 630,
              alt: `${story.title} cover`,
            },
          ]
        : [
            {
              url: 'https://mythoria.pt/Mythoria-logo-white-512x336.jpg',
              width: 1200,
              height: 630,
              alt: 'Mythoria - Personalized Books Creator',
            },
          ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: [coverUrl || 'https://mythoria.pt/Mythoria-logo-white-512x336.jpg'],
    },
  };
}

export default async function PublicStoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const story = await storyService.getPublicStorySeoData(slug);

  if (!story) {
    notFound();
  }

  const canonicalLocale = normalizeLocale(story.storyLanguage);
  if (canonicalLocale !== locale) {
    permanentRedirect(buildLocalizedPath(canonicalLocale, `/p/${slug}`));
  }

  return <PublicStoryPageClient />;
}
