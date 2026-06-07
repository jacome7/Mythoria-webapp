import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { storyService } from '@/db/services';
import { sgwFetch } from '@/lib/sgw-client';

/**
 * POST /api/stories/genai-structure
 * Kick off ASYNC story-structure generation from text + audio + analysed image
 * metadata. Proxies to SGW `POST /api/jobs/story-structure` and returns a
 * `{ jobId, estimatedDuration }` the client polls via `GET /api/jobs/:jobId`.
 *
 * Images are uploaded + analysed earlier (step 2), so only their GCS object
 * paths are sent here — never the bytes.
 */
export async function POST(request: NextRequest) {
  try {
    const currentAuthor = await getCurrentAuthor();
    if (!currentAuthor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userDescription, imageObjectPaths, audioObjectPath, storyId, characterIds, locale } =
      await request.json();

    if (!storyId) {
      return NextResponse.json({ error: 'Story ID is required' }, { status: 400 });
    }

    const hasImages = Array.isArray(imageObjectPaths) && imageObjectPaths.length > 0;
    if (!userDescription?.trim() && !hasImages && !audioObjectPath) {
      return NextResponse.json(
        { error: 'Story description, images, or audio is required' },
        { status: 400 },
      );
    }

    // Verify the story belongs to the current author
    const existingStory = await storyService.getStoryById(storyId);
    if (!existingStory || existingStory.authorId !== currentAuthor.authorId) {
      return NextResponse.json({ error: 'Story not found or access denied' }, { status: 404 });
    }

    const payload: Record<string, unknown> = {
      storyId,
      userDescription,
      imageObjectPaths,
      audioObjectPath,
      characterIds,
      locale,
    };
    // Strip null/undefined fields to avoid schema errors downstream
    Object.keys(payload).forEach((k) => {
      const key = k as keyof typeof payload;
      if (payload[key] === null || payload[key] === undefined) delete payload[key];
    });

    const resp = await sgwFetch('/api/jobs/story-structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const rawText = await resp.text();
    let data: unknown;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { raw: rawText };
    }

    if (!resp.ok) {
      console.error('[genai-structure] SGW error', { status: resp.status, body: data });
      return NextResponse.json(
        { error: 'Story-generation-workflow request failed', status: resp.status, body: data },
        { status: resp.status },
      );
    }

    // Promote temporary -> draft now that structuring has started
    try {
      if (existingStory.status === 'temporary') {
        await storyService.updateStory(storyId, { status: 'draft' });
      }
    } catch (e) {
      console.warn('[genai-structure] Failed to promote story status:', e);
    }

    // { success, jobId, estimatedDuration }
    return NextResponse.json(data as Record<string, unknown>);
  } catch (error) {
    console.error('Error starting GenAI story structuring:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to start story structuring',
      },
      { status: 500 },
    );
  }
}
