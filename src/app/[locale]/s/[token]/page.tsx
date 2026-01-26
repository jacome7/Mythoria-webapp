import { Metadata } from 'next';
import SharedStoryPageClient from './SharedStoryPageClient';
import { db } from '@/db';
import { stories, shareLinks, authors } from '@/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { toAbsoluteImageUrl } from '@/utils/image-url';

const BASE_URL = 'https://mythoria.pt';

const toAbsoluteOgUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const getShareMetadata = async (token: string) => {
  const shareLink = await db
    .select({
      title: stories.title,
      synopsis: stories.synopsis,
      coverUri: stories.coverUri,
      expiresAt: shareLinks.expiresAt,
      revoked: shareLinks.revoked,
      authorName: authors.displayName,
    })
    .from(shareLinks)
    .leftJoin(stories, eq(stories.storyId, shareLinks.storyId))
    .leftJoin(authors, eq(authors.authorId, stories.authorId))
    .where(and(eq(shareLinks.id, token), gt(shareLinks.expiresAt, new Date())))
    .limit(1);

  if (!shareLink.length) return null;
  const link = shareLink[0];
  if (link.revoked) return null;

  return {
    title: link.title || 'Untitled Story',
    synopsis: link.synopsis || '',
    coverUri: link.coverUri || undefined,
    authorName: link.authorName || undefined,
  };
};

export async function generateMetadata({
  params,
}: {
  params: { locale: string; token: string };
}): Promise<Metadata> {
  const { locale, token } = params;
  const shareData = await getShareMetadata(token);

  if (!shareData) {
    return {
      title: 'Mythoria | Personalized Books Creator',
      description: 'Turn your ideas into personalized, beautifully illustrated books with AI.',
      openGraph: {
        title: 'Mythoria | Personalized Books Creator',
        description: 'Turn your ideas into personalized, beautifully illustrated books with AI.',
        url: `${BASE_URL}/${locale}/s/${token}`,
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

  const ogTitle = `Mythoria | ${shareData.title}`;
  const ogDescription = shareData.synopsis || `Read "${shareData.title}" on Mythoria.`;
  const coverUrl = toAbsoluteOgUrl(toAbsoluteImageUrl(shareData.coverUri) || undefined);

  return {
    title: ogTitle,
    description: ogDescription,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: `${BASE_URL}/${locale}/s/${token}`,
      type: 'website',
      images: coverUrl
        ? [
            {
              url: coverUrl,
              width: 1200,
              height: 630,
              alt: `${shareData.title} cover`,
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

export default function SharedStoryPage() {
  return <SharedStoryPageClient />;
}
