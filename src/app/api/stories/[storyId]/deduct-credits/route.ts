import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { creditService, pricingService } from '@/db/services';

interface DeductCreditsRequest {
  storyId: string;
  selectedFeatures: {
    ebook: boolean;
    printed: boolean;
    audiobook: boolean;
  };
}

function getServiceDescription(serviceCode: string): string {
  switch (serviceCode) {
    case 'eBookGeneration':
      return 'Digital Book Generation';
    case 'printOrder':
      return 'Printed Book Order';
    case 'audioBookGeneration':
      return 'Audiobook Generation';
    default:
      return `Service: ${serviceCode}`;
  }
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
    }    // Calculate total credits required using database pricing
    const { total: totalCredits, breakdown } = await pricingService.calculateCreditsForFeatures(selectedFeatures);
    
    const transactions = breakdown.map(item => ({
      amount: item.credits,
      eventType: item.serviceCode as 'eBookGeneration' | 'printOrder' | 'audioBookGeneration',
      description: getServiceDescription(item.serviceCode)
    }));

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
