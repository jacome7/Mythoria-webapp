import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { ensureStoryIdAccess, AccessDeniedError } from '@/lib/authorization';
import { chapterService, storyService } from '@/db/services';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string; chapterNumber: string }> },
) {
  try {
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storyId, chapterNumber } = await params;
    const chapterNum = parseInt(chapterNumber);
    const { title, htmlContent, imageUri, imageThumbnailUri, audioUri } = await request.json();

    // Check if user has access (owner or collaborator)
    try {
      await ensureStoryIdAccess(storyId, author.authorId);
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      throw e;
    }

    // Get current chapter to determine next version
    const currentChapter = await chapterService.getStoryChapter(storyId, chapterNum);
    if (!currentChapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    // Create new chapter version
    const newChapter = await chapterService.createChapter({
      storyId,
      authorId: author.authorId,
      chapterNumber: chapterNum,
      title,
      htmlContent,
      imageUri,
      imageThumbnailUri,
      audioUri,
      version: currentChapter.version + 1,
    });

    // Update the story's updatedAt timestamp when a chapter is modified
    await storyService.updateStory(storyId, {
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      chapter: newChapter,
    });
  } catch (error) {
    console.error('Error saving chapter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string; chapterNumber: string }> },
) {
  try {
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storyId, chapterNumber } = await params;
    const chapterNum = parseInt(chapterNumber);
    const { version } = await request.json();

    // Check if user has access (owner or collaborator)
    try {
      await ensureStoryIdAccess(storyId, author.authorId);
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      throw e;
    }

    // Get chapters to find the requested version
    const chapters = await chapterService.getChaptersByStory(storyId);
    const targetChapter = chapters.find(
      (c) => c.chapterNumber === chapterNum && c.version === version,
    );

    if (!targetChapter) {
      return NextResponse.json({ error: 'Chapter version not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      chapter: {
        id: targetChapter.id,
        chapterNumber: targetChapter.chapterNumber,
        title: targetChapter.title,
        imageUri: targetChapter.imageUri,
        imageThumbnailUri: targetChapter.imageThumbnailUri,
        htmlContent: targetChapter.htmlContent,
        audioUri: targetChapter.audioUri,
        version: targetChapter.version,
        createdAt: targetChapter.createdAt,
        updatedAt: targetChapter.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching chapter version:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
