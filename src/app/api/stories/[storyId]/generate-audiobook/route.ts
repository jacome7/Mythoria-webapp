import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { creditService, pricingService } from '@/db/services';

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

    // Validate that the story belongs to the user (optional security check)
    const storyResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/stories/${storyId}`, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
    });

    if (!storyResponse.ok) {
      return NextResponse.json({ error: 'Story not found or access denied' }, { status: 404 });
    }

    const storyData = await storyResponse.json();
    if (storyData.story.status !== 'published') {
      return NextResponse.json({ error: 'Story must be published to generate audiobook' }, { status: 400 });
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

    // Call the story generation workflow service
    const workflowUrl = process.env.STORY_GENERATION_WORKFLOW_URL;
    if (!workflowUrl) {
      // If workflow is not configured, refund the credits
      await creditService.addCredits(
        author.authorId,
        audiobookPricing.credits,
        'refund'
      );
      return NextResponse.json({ error: 'Story generation service not configured' }, { status: 500 });
    }

    try {
      const workflowResponse = await fetch(`${workflowUrl}/audio/create-audiobook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId,
          voice,
        }),
      });

      if (!workflowResponse.ok) {
        const errorText = await workflowResponse.text();
        console.error('Workflow service error:', errorText);
        
        // Refund credits if workflow call fails
        await creditService.addCredits(
          author.authorId,
          audiobookPricing.credits,
          'refund'
        );

        return NextResponse.json(
          { error: 'Failed to start audiobook generation' },
          { status: workflowResponse.status }
        );
      }

      const result = await workflowResponse.json();

      // Get updated balance
      const newBalance = await creditService.getAuthorCreditBalance(author.authorId);

      return NextResponse.json({
        success: true,
        message: 'Audiobook generation started successfully',
        data: result,
        creditsDeducted: audiobookPricing.credits,
        newBalance,
      });

    } catch (workflowError) {
      console.error('Workflow service error:', workflowError);
      
      // Refund credits if workflow call fails
      await creditService.addCredits(
        author.authorId,
        audiobookPricing.credits,
        'refund'
      );

      return NextResponse.json(
        { error: 'Failed to connect to audiobook generation service' },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('Error generating audiobook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
