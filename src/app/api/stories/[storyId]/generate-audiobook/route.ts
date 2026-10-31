import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { pricingService, storyService } from '@/db/services';
import { getRecommendedVoice, getTTSProvider, isValidVoice } from '@/lib/voice-options';
import { randomUUID } from 'crypto';
import { resolveServerAnalyticsContext } from '@/lib/analytics/server-context';
import { InsufficientProductCreditsError, startProductGeneration } from '@/lib/product-generation';
import { launchAudiobookWorkflow } from '@/lib/product-launch';

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
    const { voice: requestedVoice, includeBackgroundMusic = true, analyticsContext } = body;

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

    const ttsProvider = getTTSProvider();
    const hasRequestedVoice = typeof requestedVoice === 'string' && requestedVoice.trim() !== '';
    if (requestedVoice != null && requestedVoice !== '' && !hasRequestedVoice) {
      return NextResponse.json({ error: 'Invalid voice' }, { status: 400 });
    }
    if (hasRequestedVoice && !isValidVoice(requestedVoice.trim(), ttsProvider)) {
      return NextResponse.json(
        { error: `Invalid voice "${requestedVoice}" for TTS provider ${ttsProvider}` },
        { status: 400 },
      );
    }
    const voice = hasRequestedVoice
      ? requestedVoice.trim()
      : getRecommendedVoice(ttsProvider, story.targetAudience);

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

    const launched = await launchAudiobookWorkflow({
      storyId,
      runId,
      voice,
      includeBackgroundMusic,
    });
    if (!launched.ok) {
      return NextResponse.json(
        { error: 'Failed to start audiobook generation workflow' },
        { status: 500 },
      );
    }

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
