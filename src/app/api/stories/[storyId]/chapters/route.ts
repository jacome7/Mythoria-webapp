import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { ensureStoryIdAccess, AccessDeniedError } from '@/lib/authorization';
import { chapterService, authorService } from '@/db/services'; // storyService not needed directly
import { hasPremiumBookMarker } from '@/lib/premium-children-book/contract';
import { toPremiumBookReaderData } from '@/lib/premium-children-book/reader';
import { loadPublishedPremiumBook } from '@/lib/premium-children-book/storage';
import { getPurchasableSquareSupplier } from '@/lib/print/checkout';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const { storyId } = await params;

    if (!storyId) {
      return NextResponse.json({ error: 'Story ID is required' }, { status: 400 });
    }

    // Check if user is authenticated
    const currentAuthor = await getCurrentAuthor();
    if (!currentAuthor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Enforce strict owner-only access
    let story;
    try {
      story = await ensureStoryIdAccess(storyId, currentAuthor.authorId);
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        // Return 403 to clarify permission issue (client can show access message)
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      throw e;
    }

    if (hasPremiumBookMarker(story.features)) {
      if (story.status !== 'published') {
        return NextResponse.json({ error: 'Story is still in progress' }, { status: 404 });
      }
      const premium = await loadPublishedPremiumBook(storyId, story.authorId, story.features);
      if (!premium) {
        return NextResponse.json({ error: 'Premium story unavailable' }, { status: 503 });
      }
      const owned = story.authorId === currentAuthor.authorId;
      const canPrint =
        (owned || story.isPublic === true) &&
        Boolean(await getPurchasableSquareSupplier().catch(() => null));
      return NextResponse.json(
        {
          story: {
            title: premium.opening.title,
            authorName: premium.opening.author,
            isPublic: story.isPublic,
            slug: story.slug,
          },
          chapters: [],
          premiumBook: toPremiumBookReaderData(premium, { owned }),
          canShare: owned,
          canPrint,
          canSelfPrint: owned,
        },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    // Get author information
    const author = await authorService.getAuthorById(story.authorId);
    if (!author) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    // Get all chapters for this story
    const chapters = await chapterService.getStoryChapters(storyId);

    // Transform story data for frontend
    const transformedStory = {
      title: story.title,
      authorName: story.customAuthor || author.displayName, // Use customAuthor if available, fallback to author.displayName
      dedicationMessage: story.dedicationMessage,
      targetAudience: story.targetAudience,
      graphicalStyle: story.graphicalStyle,
      coverUri: story.coverUri,
      backcoverUri: story.backcoverUri,
    };

    return NextResponse.json({
      story: transformedStory,
      chapters: chapters,
    });
  } catch (error) {
    console.error('Error fetching story chapters:', error);
    return NextResponse.json({ error: 'Failed to fetch story chapters' }, { status: 500 });
  }
}
