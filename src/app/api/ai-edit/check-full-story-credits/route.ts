import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { authorService, aiEditService, storyService } from '@/db/services';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Full story edit credit check request started');
    
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      console.log('❌ Credit check failed: No userId');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the current user
    const author = await authorService.getAuthorByClerkId(userId);
    if (!author) {
      console.log('❌ Credit check failed: Author not found for userId:', userId);
      return NextResponse.json(
        { success: false, error: 'Author not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { storyId } = body;
    
    console.log('📋 Full story edit credit check request body:', { storyId, authorId: author.authorId });

    if (!storyId) {
      console.log('❌ Credit check failed: Missing storyId');
      return NextResponse.json(
        { success: false, error: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Get story details to know the chapter count
    const story = await storyService.getStoryById(storyId);
    if (!story) {
      console.log('❌ Credit check failed: Story not found');
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      );
    }

    const chapterCount = story.chapterCount || 6; // Default to 6 if not set

    // Calculate credits needed for all chapters
    console.log('🔄 Calculating credits for', chapterCount, 'chapters');
    const creditCalculation = await aiEditService.calculateMultipleEditCredits(
      author.authorId, 
      'textEdit', 
      chapterCount
    );

    // Get current balance
    const currentBalance = await authorService.getAuthorCreditBalance(author.authorId);
    
    const canEdit = creditCalculation.totalCredits === 0 || currentBalance >= creditCalculation.totalCredits;
    
    console.log('✅ Full story edit credit check successful:', {
      canEdit,
      totalCredits: creditCalculation.totalCredits,
      currentBalance,
      chapterCount,
      freeEdits: creditCalculation.freeEdits,
      paidEdits: creditCalculation.paidEdits
    });

    return NextResponse.json({
      success: true,
      canEdit,
      chapterCount,
      totalCredits: creditCalculation.totalCredits,
      currentBalance,
      freeEdits: creditCalculation.freeEdits,
      paidEdits: creditCalculation.paidEdits,
      message: canEdit 
        ? `This will count as ${chapterCount} chapter edits and will cost ${creditCalculation.totalCredits} credits`
        : `Insufficient credits. You need ${creditCalculation.totalCredits} credits but have ${currentBalance}.`,
      breakdown: creditCalculation.breakdown
    });

  } catch (error) {
    console.error('💥 Error in full story edit credit check API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
