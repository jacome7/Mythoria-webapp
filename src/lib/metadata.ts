import { Metadata } from 'next';

interface StoryMetadata {
  title: string;
  synopsis?: string;
  plotDescription?: string;
  author: {
    displayName: string;
  };
  slug: string;
}

export async function generateStoryMetadata(story: StoryMetadata, _locale?: string): Promise<Metadata> {
  void _locale;
  const title = `${story.title} | Mythoria`;
  const description =
    story.synopsis ||
    story.plotDescription ||
    `${story.title} — a story by ${story.author.displayName} on Mythoria`;
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

export async function generateSharedStoryMetadata(story: StoryMetadata, _locale?: string): Promise<Metadata> {
  void _locale;
  const title = `Shared: ${story.title} | Mythoria`;
  const description =
    story.synopsis ||
    story.plotDescription ||
    `A shared story: ${story.title} — by ${story.author.displayName} on Mythoria`;
  
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
