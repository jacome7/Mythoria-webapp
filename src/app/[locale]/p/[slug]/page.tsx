import { Metadata } from 'next';
import { db } from '@/db';
import { stories, authors } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import PublicStoryPageClient from './PublicStoryPageClient';
import { toAbsoluteImageUrl } from '@/utils/image-url';

const BASE_URL = 'https://mythoria.pt';

const toAbsoluteOgUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const getPublicStoryMetadata = async (slug: string) => {
  const story = await db
    .select({
      title: stories.title,
      synopsis: stories.synopsis,
      plotDescription: stories.plotDescription,
      coverUri: stories.coverUri,
      authorName: authors.displayName,
    })
    .from(stories)
    .leftJoin(authors, eq(authors.authorId, stories.authorId))
    .where(and(eq(stories.slug, slug), eq(stories.isPublic, true)))
    .limit(1);

  if (!story.length) return null;
  return story[0];
};

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const { locale, slug } = params;
  const story = await getPublicStoryMetadata(slug);

  if (!story) {
    return {
      title: 'Mythoria | Personalized Books Creator',
      description: 'Turn your ideas into personalized, beautifully illustrated books with AI.',
      openGraph: {
        title: 'Mythoria | Personalized Books Creator',
        description: 'Turn your ideas into personalized, beautifully illustrated books with AI.',
        url: `${BASE_URL}/${locale}/p/${slug}`,
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

  const ogTitle = `Mythoria | ${story.title}`;
  const ogDescription =
    story.synopsis || story.plotDescription || `Read "${story.title}" on Mythoria.`;
  const coverUrl = toAbsoluteOgUrl(toAbsoluteImageUrl(story.coverUri) || undefined);

  return {
    title: ogTitle,
    description: ogDescription,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: `${BASE_URL}/${locale}/p/${slug}`,
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

export default function PublicStoryPage() {
  return <PublicStoryPageClient />;
}
