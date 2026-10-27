import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAuthor } from '@/lib/auth';
import { storyService } from '@/db/services';
import { sgwFetch } from '@/lib/sgw-client';
import { storyPreferencesSchema } from '@/lib/story-templates/journey';
import { isStoryTemplatesEnabledForAuthor } from '@/lib/story-templates/feature';

const inputSchema = z.object({
  storyId: z.string().uuid(),
  userDescription: z.string().max(40_000).nullish(),
  imageObjectPaths: z.array(z.string().min(1).max(1024)).max(3).nullish(),
  audioObjectPath: z.string().min(1).max(1024).nullish(),
  characterIds: z.array(z.string().uuid()).max(50).nullish(),
  locale: z.enum(['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE']).optional(),
  storyPreferences: storyPreferencesSchema.optional(),
  factuality: z.literal('memory').optional(),
  structureRequestId: z.string().uuid().optional(),
});

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

    let rawInput: unknown;
    try {
      rawInput = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success)
      return NextResponse.json({ error: 'Invalid story input' }, { status: 400 });
    const {
      userDescription,
      imageObjectPaths,
      audioObjectPath,
      storyId,
      characterIds,
      locale,
      storyPreferences,
      factuality,
      structureRequestId,
    } = parsed.data;

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
    if (
      !['temporary', 'draft'].includes(existingStory.status ?? '') ||
      ['queued', 'running', 'completed'].includes(existingStory.storyGenerationStatus ?? '')
    ) {
      return NextResponse.json(
        { error: 'Only an unfinished draft can be structured' },
        { status: 409 },
      );
    }

    if (
      (storyPreferences !== undefined ||
        factuality !== undefined ||
        structureRequestId !== undefined) &&
      !isStoryTemplatesEnabledForAuthor(currentAuthor)
    ) {
      // Rollback stops new template work, but a lost response must not strand
      // an already accepted owned request. Recover its identity with a read only.
      if (structureRequestId) {
        try {
          const pendingResponse = await sgwFetch(`/api/jobs/${structureRequestId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          if (pendingResponse.ok) {
            const pending = await pendingResponse.json();
            const job = pending?.job;
            if (job?.type === 'story_structure' && job.metadata?.storyId === storyId) {
              return NextResponse.json({
                success: true,
                jobId: structureRequestId,
                duplicate: true,
                status: job.status,
                estimatedDuration:
                  typeof job.estimatedDuration === 'number' ? job.estimatedDuration : 0,
              });
            }
          }
        } catch {
          // No new work and no private upstream details on failed recovery.
        }
      }
      return NextResponse.json({ error: 'Story templates are unavailable' }, { status: 404 });
    }

    const payload: Record<string, unknown> = {
      storyId,
      userDescription,
      imageObjectPaths,
      audioObjectPath,
      characterIds,
      locale,
      storyPreferences,
      structureRequestId,
      factuality,
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
      return NextResponse.json({ error: 'Invalid workflow response' }, { status: 502 });
    }

    if (!resp.ok) {
      return NextResponse.json(
        { error: 'Story-generation-workflow request failed' },
        { status: resp.status },
      );
    }

    // Promote temporary -> draft now that structuring has started
    try {
      if (existingStory.status === 'temporary') {
        await storyService.updateStory(storyId, { status: 'draft' });
      }
    } catch {
      // Worker completion also persists draft status; do not leak database details.
    }

    // { success, jobId, estimatedDuration }
    return NextResponse.json(data as Record<string, unknown>);
  } catch {
    return NextResponse.json(
      {
        error: 'Failed to start story structuring',
        details: 'Failed to start story structuring',
      },
      { status: 500 },
    );
  }
}
