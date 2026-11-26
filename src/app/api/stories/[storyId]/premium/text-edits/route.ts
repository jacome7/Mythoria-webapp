import { NextResponse } from 'next/server';
import { z } from 'zod';
import { storyService } from '@/db/services';
import { getCurrentAuthor } from '@/lib/auth';
import { readPremiumBookMarker } from '@/lib/premium-children-book/contract';
import { sgwFetch } from '@/lib/sgw-client';

export const maxDuration = 120;

const editSchema = z
  .object({
    expectedRevision: z.uuid(),
    correctionId: z.uuid(),
    pageNumber: z.number().int().min(1).max(33),
    text: z.string().max(2000),
  })
  .strict()
  .refine((input) => input.expectedRevision !== input.correctionId);

const noStore = { 'Cache-Control': 'private, no-store' };
const workflowFailure = z.object({ code: z.string() });
const failure = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: noStore });

export async function POST(request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const author = await getCurrentAuthor();
    if (!author) return failure('unauthorized', 401);
    const { storyId } = await context.params;
    const input = editSchema.safeParse(await request.json().catch(() => null));
    if (!z.uuid().safeParse(storyId).success || !input.success) return failure('invalid_edit', 400);

    const story = await storyService.getStoryById(storyId);
    if (!story || story.authorId !== author.authorId || story.status !== 'published')
      return failure('story_unavailable', 404);
    const marker = readPremiumBookMarker(story.features);
    const { expectedRevision, correctionId } = input.data;
    if (
      marker?.state !== 'published' ||
      ![expectedRevision, correctionId].includes(marker.revision)
    ) {
      return failure('edition_changed', 409);
    }

    const result = await sgwFetch(`/internal/premium/stories/${storyId}/text-edits`, {
      method: 'POST',
      body: JSON.stringify({ ...input.data, ownerId: author.authorId }),
      cache: 'no-store',
    });
    if (!result.ok) {
      const { code } = workflowFailure.safeParse(await result.json().catch(() => null)).data ?? {};
      if (result.status === 400 && code === 'invalid_edit') return failure(code, 400);
      if (result.status === 404 && code === 'premium_story_missing') {
        return failure('story_unavailable', 404);
      }
      if (
        result.status === 409 &&
        (code === 'premium_correction_conflict' || code === 'premium_publish_conflict')
      ) {
        return failure('edition_changed', 409);
      }
      if (result.status === 422 && (code === 'text_not_editable' || code === 'text_does_not_fit')) {
        return failure(code, 422);
      }
      return failure('edit_failed', 503);
    }
    const saved = z
      .object({ revision: z.union([z.literal(expectedRevision), z.literal(correctionId)]) })
      .parse(await result.json());
    return NextResponse.json(saved, { headers: noStore });
  } catch {
    return failure('edit_failed', 503);
  }
}
