import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { shareLinks } from '@/db/schema';
import { authorService, storyService } from '@/db/services';
import { AccessDeniedError, ensureStoryIdAccess } from '@/lib/authorization';
import {
  hasPremiumBookMarker,
  PremiumBookContractError,
} from '@/lib/premium-children-book/contract';
import {
  downloadPremiumReadingImage,
  loadPublishedPremiumBook,
} from '@/lib/premium-children-book/storage';

const uuid = z.string().uuid();
const noStore = { 'Cache-Control': 'private, no-store' };
const missing = () =>
  NextResponse.json({ error: 'Image not found' }, { status: 404, headers: noStore });

export async function GET(
  request: Request,
  context: { params: Promise<{ storyId: string; image: string }> },
) {
  const { storyId, image } = await context.params;
  const pageNumber = /^[1-9]\d?$/.test(image) ? Number(image) : 0;
  if (
    !uuid.safeParse(storyId).success ||
    !(image === 'front' || image === 'back' || image === 'motif' || pageNumber)
  ) {
    return missing();
  }

  try {
    const story = await storyService.getStoryById(storyId);
    if (!story || story.status !== 'published' || !hasPremiumBookMarker(story.features)) {
      return missing();
    }
    const { searchParams } = new URL(request.url);
    const share = searchParams.get('share');
    if (share !== null) {
      if (!uuid.safeParse(share).success) return missing();
      const [link] = await db
        .select({ accessLevel: shareLinks.accessLevel })
        .from(shareLinks)
        .where(
          and(
            eq(shareLinks.id, share),
            eq(shareLinks.storyId, storyId),
            eq(shareLinks.revoked, false),
            gt(shareLinks.expiresAt, new Date()),
          ),
        );
      if (!link) return missing();
      if ((link.accessLevel === 'edit' || link.accessLevel === 'view') && !(await auth()).userId) {
        return missing();
      }
    } else if (!story.isPublic) {
      const { userId } = await auth();
      const author = userId ? await authorService.getAuthorByClerkId(userId) : null;
      if (!author) return missing();
      await ensureStoryIdAccess(storyId, author.authorId);
    }

    const book = await loadPublishedPremiumBook(storyId, story.authorId, story.features);
    const revision = searchParams.get('revision');
    if (!book || (revision !== null && revision !== book.revision)) return missing();
    const asset =
      image === 'motif'
        ? book.motifArtwork
        : image === 'front' || image === 'back'
          ? book.covers[image]
          : book.pages[pageNumber - 1]?.reading;
    if (!asset) return missing();
    const { bytes, contentType } = await downloadPremiumReadingImage(storyId, asset);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        ...noStore,
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) return missing();
    console.error('Premium book image unavailable', {
      storyId,
      image,
      failure:
        error instanceof PremiumBookContractError
          ? error.message
          : 'Storage or authorization error',
    });
    return NextResponse.json({ error: 'Image unavailable' }, { status: 503, headers: noStore });
  }
}
