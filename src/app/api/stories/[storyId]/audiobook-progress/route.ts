import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { storyService } from '@/db/services';

interface RouteContext {
  params: Promise<{
    storyId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const author = await getCurrentAuthor();
    
    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storyId } = await context.params;

    // Verify the story belongs to the user
    const story = await storyService.getStoryById(storyId);
    
    if (!story || story.authorId !== author.authorId) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Get the real audiobook status from the database
    const audiobookStatus = story.audiobookStatus || 'not_started';
    
    let audiobookGenerationCompletedPercentage = 0;
    let currentStep = 'initializing';
    let chaptersProcessed = 0;
    const totalChapters = story.chapterCount || 5;

    switch (audiobookStatus) {
      case 'generating':
        // In a real implementation, you'd track actual progress
        // For now, simulate progress based on time elapsed or other factors
        audiobookGenerationCompletedPercentage = Math.min(85, Math.random() * 85);
        currentStep = 'processing_chapters';
        chaptersProcessed = Math.floor(audiobookGenerationCompletedPercentage / 100 * totalChapters);
        break;
      case 'completed':
        audiobookGenerationCompletedPercentage = 100;
        currentStep = 'completed';
        chaptersProcessed = totalChapters;
        break;
      case 'failed':
        audiobookGenerationCompletedPercentage = 0;
        currentStep = 'failed';
        break;
      default:
        audiobookGenerationCompletedPercentage = 0;
        currentStep = 'not_started';
    }

    return NextResponse.json({
      audiobookGenerationCompletedPercentage,
      audiobookGenerationStatus: audiobookStatus,
      currentStep,
      chaptersProcessed,
      totalChapters,
    });

  } catch (error) {
    console.error('Error fetching audiobook progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audiobook progress' },
      { status: 500 }
    );
  }
}
