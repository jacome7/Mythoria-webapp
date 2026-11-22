import { STORY_BRIEF_MAX_LENGTH } from '@/lib/story-templates/story-input-limit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { storyService, StoryDraftOwnershipError } from '@/db/services';
import { expectedWhispererProject } from '@/lib/story-whisperer/http';
import { ensureWhispererDraftReady } from '@/lib/story-whisperer/server';
import { BiographerError } from '@/db/services/biographer';
import { getCurrentAuthor } from '@/lib/auth';
import { linkReferralFromRequest } from '@/lib/referrals/http';
import { resolveAdContextSafely } from '@/lib/openai-ads/context';
import { conversions } from '@/lib/openai-ads/events';
import { enqueueAdConversion } from '@/lib/openai-ads/outbox';

const draftSchema = z
  .object({
    draftId: z.string().uuid(),
    storyWhisperer: z.literal(true).optional(),
    title: z.string().trim().min(1).max(300),
    plotDescription: z.string().max(STORY_BRIEF_MAX_LENGTH),
    storyLanguage: z.enum(['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE']),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const { draftId, storyWhisperer, ...input } = parsed.data;
    if (storyWhisperer)
      await ensureWhispererDraftReady(author.authorId, draftId, expectedWhispererProject(request));
    await linkReferralFromRequest(request, author.authorId);
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
    // Draft retries reuse the same story id, so the outbox unique index deduplicates them.
    const conversion = conversions.storyCreationStarted(story.storyId);
    await enqueueAdConversion(db, {
      conversion,
      authorId: author.authorId,
      adContext: await resolveAdContextSafely({
        headers: request.headers,
        cookies: request.cookies,
        authorId: author.authorId,
      }),
    });
    return NextResponse.json({ story, adEventId: conversion.eventId }, { status: 200 });
  } catch (error) {
    if (error instanceof BiographerError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof StoryDraftOwnershipError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    // Never include submitted story text or database error details in the response.
    return NextResponse.json({ error: 'Failed to prepare draft' }, { status: 500 });
  }
}
