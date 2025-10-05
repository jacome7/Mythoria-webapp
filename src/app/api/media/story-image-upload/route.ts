import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { storyService } from '@/db/services';
import { sgwFetch } from '@/lib/sgw-client';

export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { storyId, imageType, chapterNumber, contentType, dataUrl, currentImageUrl } = body || {};
    if (!storyId || !imageType || !contentType || !dataUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const story = await storyService.getStoryById(storyId);
    if (!story || story.authorId !== author.authorId) {
      return NextResponse.json(
        { success: false, error: 'Story not found or access denied' },
        { status: 404 },
      );
    }

    const resp = await sgwFetch('/ai/media/story-image-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyId,
        imageType,
        chapterNumber,
        contentType,
        dataUrl,
        currentImageUrl,
      }),
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
