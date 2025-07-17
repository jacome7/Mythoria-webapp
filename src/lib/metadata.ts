import { Metadata } from 'next';
import { getLibTranslations } from '@/utils/lib-translations';

interface StoryMetadata {
  title: string;
  synopsis?: string;
  plotDescription?: string;
  author: {
    displayName: string;
  };
  slug: string;
}

export async function generateStoryMetadata(story: StoryMetadata, locale?: string): Promise<Metadata> {
  const { t } = await getLibTranslations(locale);
  const title = `${story.title} | Mythoria`;
  const description = story.synopsis || story.plotDescription || t('metadata.descriptions.storyFallback', {
    title: story.title,
    author: story.author.displayName
  });
  const url = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.com'}/p/${story.slug}`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Mythoria',
      type: 'article',
      authors: [story.author.displayName],
      // You can add a default or generated story image here
      images: [
        {
          url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.com'}/api/og/story/${story.slug}`,
          width: 1200,
          height: 630,
          alt: `Cover image for "${story.title}"`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.com'}/api/og/story/${story.slug}`],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export async function generateSharedStoryMetadata(story: StoryMetadata, locale?: string): Promise<Metadata> {
  const { t } = await getLibTranslations(locale);
  const title = t('metadata.titles.sharedStory', { title: story.title });
  const description = story.synopsis || story.plotDescription || t('metadata.descriptions.sharedStoryFallback', {
    title: story.title,
    author: story.author.displayName
  });
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'Mythoria',
      type: 'article',
      authors: [story.author.displayName],
      images: [
        {
          url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.com'}/api/og/story/${story.slug}`,
          width: 1200,
          height: 630,
          alt: `Cover image for "${story.title}"`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.com'}/api/og/story/${story.slug}`],
    },
    robots: {
      index: false, // Don't index shared links
      follow: false,
    },
  };
}
