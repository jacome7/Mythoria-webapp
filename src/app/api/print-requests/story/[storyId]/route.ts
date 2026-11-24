import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAuthor } from '@/lib/auth';
import { storyService } from '@/db/services';
import { hasPremiumBookMarker } from '@/lib/premium-children-book/contract';
import { loadPublishedPremiumBook } from '@/lib/premium-children-book/storage';
import { premiumBookImagePath } from '@/lib/premium-children-book/reader';
import { toAbsoluteImageUrl } from '@/utils/image-url';

export async function GET(_request: Request, context: { params: Promise<{ storyId: string }> }) {
  const author = await getCurrentAuthor();
  if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { storyId } = await context.params;
  const missing = () => NextResponse.json({ error: 'Story unavailable' }, { status: 404 });
  if (!z.uuid().safeParse(storyId).success) return missing();
  const story = await storyService.getStoryById(storyId);
  if (
    !story ||
    story.status !== 'published' ||
    (!story.isPublic && story.authorId !== author.authorId)
  )
    return missing();
  const premium = hasPremiumBookMarker(story.features);
  const edition = premium
    ? await loadPublishedPremiumBook(storyId, story.authorId, story.features)
    : null;
  if (premium && !edition) return missing();
  return NextResponse.json(
    {
      story: {
        storyId,
        title: edition?.opening.title ?? story.title,
        status: story.status,
        synopsis: edition?.opening.synopsis ?? story.synopsis ?? '',
        chapterCount: edition ? 0 : story.chapterCount,
        bookType: edition ? 'premium_children' : 'standard',
        frontCoverImageUrl: edition
          ? premiumBookImagePath(storyId, 'front', { revision: edition.revision })
          : toAbsoluteImageUrl(story.coverUri),
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
