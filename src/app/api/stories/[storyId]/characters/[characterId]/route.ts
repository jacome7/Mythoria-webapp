import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '../../../../../../lib/auth';
import { storyCharacterService, storyService } from '../../../../../../db/services';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string; characterId: string }> },
) {
  try {
    // Get the current authenticated user
    const currentAuthor = await getCurrentAuthor();

    if (!currentAuthor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const storyId = resolvedParams.storyId;
    const characterId = resolvedParams.characterId;

    // Check if story exists and belongs to the current author
    const story = await storyService.getStoryById(storyId);

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    if (story.authorId !== currentAuthor.authorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Remove character from story (delete the association, not the character)
    await storyCharacterService.removeCharacterFromStory(storyId, characterId);

    return NextResponse.json({
      success: true,
      message: 'Character removed from story successfully',
    });
  } catch (error) {
    console.error('Error removing character from story:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
