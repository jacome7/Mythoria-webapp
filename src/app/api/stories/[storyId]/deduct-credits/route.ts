import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { creditService } from '@/db/services';

interface DeductCreditsRequest {
  storyId: string;
  selectedFeatures: {
    ebook: boolean;
    printed: boolean;
    audiobook: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    
    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: DeductCreditsRequest = await request.json();
    const { storyId, selectedFeatures } = body;

    if (!storyId) {
      return NextResponse.json({ error: 'Story ID is required' }, { status: 400 });
    }    // Import pricing config
    const pricingConfig = await import('@/config/pricing.json');
    const pricing = pricingConfig.default.deliveryOptions;

    // Calculate total credits required
    let totalCredits = 0;
    const transactions = [];

    if (selectedFeatures.ebook) {
      totalCredits += pricing.ebook.credits;
      transactions.push({
        amount: pricing.ebook.credits,
        eventType: 'eBookGeneration' as const,
        description: 'Digital Book Generation'
      });
    }

    if (selectedFeatures.printed) {
      totalCredits += pricing.printed.credits;
      transactions.push({
        amount: pricing.printed.credits,
        eventType: 'printOrder' as const,
        description: 'Printed Book Order'
      });
    }

    if (selectedFeatures.audiobook) {
      totalCredits += pricing.audiobook.credits;
      transactions.push({
        amount: pricing.audiobook.credits,
        eventType: 'audioBookGeneration' as const,
        description: 'Audiobook Generation'
      });
    }

    // Check if user has sufficient credits
    const currentBalance = await creditService.getAuthorCreditBalance(author.authorId);
    if (currentBalance < totalCredits) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          required: totalCredits,
          available: currentBalance,
          shortfall: totalCredits - currentBalance
        }, 
        { status: 402 } // Payment Required
      );
    }

    // Deduct credits for each selected service
    const ledgerEntries = [];
    for (const transaction of transactions) {
      try {
        const entry = await creditService.deductCredits(
          author.authorId,
          transaction.amount,
          transaction.eventType,
          storyId
        );
        ledgerEntries.push({
          ...entry,
          description: transaction.description
        });
      } catch (error) {
        console.error(`Error deducting credits for ${transaction.description}:`, error);
        return NextResponse.json(
          { error: `Failed to deduct credits for ${transaction.description}` },
          { status: 500 }
        );
      }
    }

    // Get updated balance
    const newBalance = await creditService.getAuthorCreditBalance(author.authorId);

    return NextResponse.json({
      success: true,
      transactions: ledgerEntries,
      totalDeducted: totalCredits,
      previousBalance: currentBalance,
      newBalance: newBalance
    });

  } catch (error) {
    console.error('Error deducting credits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
