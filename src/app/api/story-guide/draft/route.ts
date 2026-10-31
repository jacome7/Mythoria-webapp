import { STORY_BRIEF_MAX_LENGTH } from '@/lib/story-templates/story-input-limit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { storyService, StoryDraftOwnershipError } from '@/db/services';
import { getCurrentAuthor } from '@/lib/auth';
import { linkReferralFromRequest } from '@/lib/referrals/http';
import { isStoryTemplatesEnabledForAuthor } from '@/lib/story-templates/feature';

const draftSchema = z
  .object({
    draftId: z.string().uuid(),
    title: z.string().trim().min(1).max(300),
    plotDescription: z.string().max(STORY_BRIEF_MAX_LENGTH),
    storyLanguage: z.enum(['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE']),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isStoryTemplatesEnabledForAuthor(author))
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    let body: unknown;
    try {
      const text = await request.text();
      if (text.length > 250_000)
        return NextResponse.json({ error: 'Request too large' }, { status: 413 });
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const parsed = draftSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    await linkReferralFromRequest(request, author.authorId);
    const { draftId, ...input } = parsed.data;
    const story = await storyService.createStory({
      ...input,
      storyId: draftId,
      authorId: author.authorId,
      status: 'temporary',
    });
    if (!story || story.authorId !== author.authorId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (
      !['temporary', 'draft'].includes(story.status ?? '') ||
      ['queued', 'running', 'completed'].includes(story.storyGenerationStatus ?? '')
    ) {
      return NextResponse.json({ error: 'Story is no longer an editable draft' }, { status: 409 });
    }
    return NextResponse.json({ story }, { status: 200 });
  } catch (error) {
    if (error instanceof StoryDraftOwnershipError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    // Never include submitted story text or database error details in the response.
    return NextResponse.json({ error: 'Failed to prepare draft' }, { status: 500 });
  }
}
