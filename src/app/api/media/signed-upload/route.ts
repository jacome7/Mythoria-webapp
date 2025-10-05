import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { storyService } from '@/db/services';
import { sgwFetch } from '@/lib/sgw-client';

export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { storyId, contentType, kind, filename, dataUrl } = body || {};
    if (!storyId || !contentType || !kind || !dataUrl) {
      return NextResponse.json(
        { error: 'storyId, contentType, kind and dataUrl are required' },
        { status: 400 },
      );
    }

    const story = await storyService.getStoryById(storyId);
    if (!story || story.authorId !== author.authorId) {
      return NextResponse.json({ error: 'Story not found or access denied' }, { status: 404 });
    }

    const resp = await sgwFetch('/ai/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId, contentType, kind, filename, dataUrl }),
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
