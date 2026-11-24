import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { ensureStoryIdAccess, AccessDeniedError } from '@/lib/authorization';
import { storyService, chapterService } from '@/db/services';
import { hasPremiumBookMarker } from '@/lib/premium-children-book/contract';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storyId } = await params;

    // Check if user has access (owner or collaborator)
    let story;
    try {
      story = await ensureStoryIdAccess(storyId, author.authorId);
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      throw e;
    }

    if (hasPremiumBookMarker(story.features)) {
      return NextResponse.json({ error: 'incompatible_book_features' }, { status: 422 });
    }

    // Get all chapters for this story
    const chapters = await chapterService.getStoryChapters(storyId);

    return NextResponse.json({
      success: true,
      story: {
        storyId: story.storyId,
        title: story.title,
        storyLanguage: story.storyLanguage,
        synopsis: story.synopsis,
        dedicationMessage: story.dedicationMessage,
        customAuthor: story.customAuthor,
        coverUri: story.coverUri,
        backcoverUri: story.backcoverUri,
        targetAudience: story.targetAudience,
        graphicalStyle: story.graphicalStyle,
        createdAt: story.createdAt,
        updatedAt: story.updatedAt,
      },
      chapters: chapters.map((chapter) => ({
        id: chapter.id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        imageUri: chapter.imageUri,
        imageThumbnailUri: chapter.imageThumbnailUri,
        htmlContent: chapter.htmlContent,
        audioUri: chapter.audioUri,
        version: chapter.version,
        createdAt: chapter.createdAt,
        updatedAt: chapter.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching story for editing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storyId } = await params;
    const updates = await request.json();

    // Check if user has access (owner or collaborator)
    try {
      const story = await ensureStoryIdAccess(storyId, author.authorId);
      if (hasPremiumBookMarker(story.features)) {
        return NextResponse.json({ error: 'incompatible_book_features' }, { status: 422 });
      }
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      throw e;
    }

    // Update story metadata
    const updatedStory = await storyService.updateStory(storyId, {
      title: updates.title,
      synopsis: updates.synopsis,
      dedicationMessage: updates.dedicationMessage,
      customAuthor: updates.customAuthor,
      coverUri: updates.coverUri,
      backcoverUri: updates.backcoverUri,
      targetAudience: updates.targetAudience,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      story: updatedStory,
    });
  } catch (error) {
    console.error('Error updating story:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
