import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { creditService, pricingService, storyService } from '@/db/services';
import { publishAudiobookRequest } from '@/lib/pubsub';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const author = await getCurrentAuthor();
    
    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storyId } = await params;
    const body = await request.json();
    const { voice = 'coral' } = body;

    // Validate that the story belongs to the user and get story data
    const story = await storyService.getStoryById(storyId);
    
    if (!story || story.authorId !== author.authorId) {
      return NextResponse.json({ error: 'Story not found or access denied' }, { status: 404 });
    }

    if (story.status !== 'published') {
      return NextResponse.json({ error: 'Story must be completed to generate audiobook' }, { status: 400 });
    }

    // Get audiobook pricing
    const audiobookPricing = await pricingService.getPricingByServiceCode('audioBookGeneration');
    if (!audiobookPricing) {
      return NextResponse.json({ error: 'Audiobook pricing not configured' }, { status: 500 });
    }

    // Check if user has sufficient credits
    const currentBalance = await creditService.getAuthorCreditBalance(author.authorId);
    if (currentBalance < audiobookPricing.credits) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        required: audiobookPricing.credits,
        available: currentBalance,
        shortfall: audiobookPricing.credits - currentBalance
      }, { status: 402 }); // Payment Required
    }

    // Deduct credits first (before calling the service)
    try {
      await creditService.deductCredits(
        author.authorId,
        audiobookPricing.credits,
        'audioBookGeneration',
        storyId
      );
    } catch (error) {
      console.error('Error deducting credits:', error);
      return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 });
    }

    // Generate a unique run ID for this audiobook generation
    const runId = uuidv4();

    // Update story status to indicate audiobook generation is in progress
    await storyService.updateStory(storyId, {
      audiobookStatus: 'generating' as const,
    });

    // Publish the Pub/Sub message to trigger the audiobook generation workflow
    try {
      await publishAudiobookRequest({
        storyId: storyId,
        runId: runId,
        voice: voice,
        timestamp: new Date().toISOString(),
      });
      
      console.log(`Audiobook generation request published for story ${storyId}, run ${runId}`);
    } catch (pubsubError) {
      console.error('Failed to publish audiobook request:', pubsubError);
      
      // Revert story status and refund credits since we couldn't trigger the workflow
      await storyService.updateStory(storyId, {
        audiobookStatus: null,
      });
      
      await creditService.addCredits(
        author.authorId,
        audiobookPricing.credits,
        'refund'
      );
      
      return NextResponse.json(
        { error: "Failed to start audiobook generation workflow" },
        { status: 500 }
      );
    }

    // Get updated balance
    const newBalance = await creditService.getAuthorCreditBalance(author.authorId);

    // Return 202 Accepted to indicate async processing
    return NextResponse.json({
      success: true,
      message: 'Audiobook generation started successfully',
      storyId: storyId,
      runId: runId,
      voice: voice,
      status: "queued",
      creditsDeducted: audiobookPricing.credits,
      newBalance,
    }, { status: 202 });

  } catch (error) {
    console.error('Error generating audiobook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
