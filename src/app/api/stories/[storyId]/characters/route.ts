import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '../../../../../lib/auth';
import { storyCharacterService, storyService } from '../../../../../db/services';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    // Get the current authenticated user
    const currentAuthor = await getCurrentAuthor();
    
    if (!currentAuthor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const storyId = resolvedParams.storyId;
    
    // Check if story exists and belongs to the current author
    const story = await storyService.getStoryById(storyId);
    
    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }
    
    if (story.authorId !== currentAuthor.authorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse the request body
    const { characterId, role } = await request.json();

    if (!characterId) {
      return NextResponse.json(
        { error: 'Character ID is required' },
        { status: 400 }
      );
    }

    // Add character to story
    const relation = await storyCharacterService.addCharacterToStory(storyId, characterId, role);

    return NextResponse.json({ 
      success: true, 
      relation 
    });

  } catch (error) {
    console.error('Error adding character to story:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    // Get the current authenticated user
    const currentAuthor = await getCurrentAuthor();
    
    if (!currentAuthor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const storyId = resolvedParams.storyId;
    
    // Check if story exists and belongs to the current author
    const story = await storyService.getStoryById(storyId);
    
    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }
    
    if (story.authorId !== currentAuthor.authorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get characters for this story
    const characters = await storyCharacterService.getCharactersByStory(storyId);

    return NextResponse.json({ 
      success: true, 
      characters 
    });

  } catch (error) {
    console.error('Error fetching story characters:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
