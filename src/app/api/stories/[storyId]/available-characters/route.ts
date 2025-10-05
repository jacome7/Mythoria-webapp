import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '../../../../../lib/auth';
import { storyCharacterService, storyService, characterService } from '../../../../../db/services';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> },
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

    // Get all characters for this author
    const allCharacters = await characterService.getCharactersByAuthor(currentAuthor.authorId); // Get characters already in this story
    const storyCharacters = await storyCharacterService.getCharactersByStory(storyId);
    const storyCharacterIds = storyCharacters.map(
      (sc: { character: { characterId: string } }) => sc.character.characterId,
    );

    // Filter out characters already in the story
    const availableCharacters = allCharacters.filter(
      (character: { characterId: string }) => !storyCharacterIds.includes(character.characterId),
    );

    return NextResponse.json({
      success: true,
      characters: availableCharacters,
    });
  } catch (error) {
    console.error('Error fetching available characters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
