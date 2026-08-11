import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { pricingService, storyService } from '@/db/services';
import { publishAudiobookRequest } from '@/lib/pubsub';
import { randomUUID } from 'crypto';
import { resolveServerAnalyticsContext } from '@/lib/analytics/server-context';
import { analyticsReference } from '@/lib/analytics/reference';
import {
  compensateProductGeneration,
  InsufficientProductCreditsError,
  markProductGenerationQueued,
  startProductGeneration,
} from '@/lib/product-generation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const author = await getCurrentAuthor();

    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storyId } = await params;
    const body = await request.json();
    const { voice = 'coral', includeBackgroundMusic = true, analyticsContext } = body;

    // Validate that the story belongs to the user and get story data
    const story = await storyService.getStoryById(storyId);

    if (!story || story.authorId !== author.authorId) {
      return NextResponse.json({ error: 'Story not found or access denied' }, { status: 404 });
    }

    if (story.status !== 'published') {
      return NextResponse.json(
        { error: 'Story must be completed to generate audiobook' },
        { status: 400 },
      );
    }

    // Get audiobook pricing
    const audiobookPricing = await pricingService.getPricingByServiceCode('audioBookGeneration');
    if (!audiobookPricing) {
      return NextResponse.json({ error: 'Audiobook pricing not configured' }, { status: 500 });
    }

    const analytics = await resolveServerAnalyticsContext({
      browserContext: analyticsContext,
      attributionId: request.cookies.get('mythoria_attribution')?.value,
      authorId: author.authorId,
      storedConsentValue: request.cookies.get('mythoria_consent')?.value,
    });
    const started = await startProductGeneration({
      actionType: 'audiobook_generation',
      authorId: author.authorId,
      userId: author.clerkUserId,
      storyId,
      idempotencyKey: request.headers.get('idempotency-key')?.trim() || randomUUID(),
      creditsSpent: audiobookPricing.credits,
      creditEventType: 'audioBookGeneration',
      attributionId: analytics.attributionId,
      analyticsContext: analytics.context,
      analyticsConsent: analytics.consent,
      primaryIntent: analytics.primaryIntent,
      landingSlug: analytics.landingSlug,
    });
    const runId = started.request.runId;

    if (started.request.status === 'failed') {
      return NextResponse.json(
        { error: 'Previous audiobook generation request failed; retry with a new request' },
        { status: 409 },
      );
    }
    if (started.request.status !== 'pending') {
      return NextResponse.json(
        {
          success: true,
          message: 'Audiobook generation already started',
          storyId,
          runId,
          voice,
          status: started.request.status,
          creditsDeducted: audiobookPricing.credits,
          newBalance: started.remainingCredits,
        },
        { status: 202 },
      );
    }

    // Update story status to indicate audiobook generation is in progress
    await storyService.updateStory(storyId, {
      audiobookStatus: 'generating' as const,
    });

    // Publish the Pub/Sub message to trigger the audiobook generation workflow
    let messageId: string;
    try {
      messageId = String(
        await publishAudiobookRequest({
          storyId: storyId,
          runId: runId,
          voice: voice,
          includeBackgroundMusic: includeBackgroundMusic,
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (pubsubError) {
      console.error('Failed to publish audiobook request:', pubsubError);

      // Revert story status and refund credits since we couldn't trigger the workflow
      await storyService.updateStory(storyId, {
        audiobookStatus: null,
      });

      await compensateProductGeneration(runId, 'queue', 'pubsub_publish_failed');

      return NextResponse.json(
        { error: 'Failed to start audiobook generation workflow' },
        { status: 500 },
      );
    }
    await markProductGenerationQueued(runId, messageId);
    console.info('[Audiobook] Generation request queued', {
      runRef: analyticsReference(runId),
    });

    // Return 202 Accepted to indicate async processing
    return NextResponse.json(
      {
        success: true,
        message: 'Audiobook generation started successfully',
        storyId: storyId,
        runId: runId,
        voice: voice,
        status: 'queued',
        creditsDeducted: audiobookPricing.credits,
        newBalance: started.remainingCredits,
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof InsufficientProductCreditsError) {
      const pricing = await pricingService.getPricingByServiceCode('audioBookGeneration');
      const required = pricing?.credits ?? 0;
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required,
          available: error.available,
          shortfall: Math.max(0, required - error.available),
        },
        { status: 402 },
      );
    }
    console.error('Error generating audiobook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
