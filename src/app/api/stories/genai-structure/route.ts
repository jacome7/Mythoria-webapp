import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { generateStructuredStory } from "@/lib/genai-story-structurer";
import { characterService, storyService, storyCharacterService } from "@/db/services";

export async function POST(request: NextRequest) {
  try {
    // Get the current authenticated user
    const currentAuthor = await getCurrentAuthor();
    
    if (!currentAuthor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }    // Parse the request body
    const { userDescription, imageData, audioData, storyId } = await request.json();

    if (!userDescription?.trim() && !imageData && !audioData) {
      return NextResponse.json(
        { error: 'Story description, image data, or audio data is required' },
        { status: 400 }
      );
    }

    if (!storyId) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Verify the story belongs to the current author
    const existingStory = await storyService.getStoryById(storyId);
    if (!existingStory || existingStory.authorId !== currentAuthor.authorId) {
      return NextResponse.json(
        { error: 'Story not found or access denied' },
        { status: 404 }
      );
    }

    // Get existing characters for this author
    const existingCharacters = await characterService.getCharactersByAuthor(currentAuthor.authorId);    // Call the GenAI service to structure the story
    console.log('Calling GenAI to structure story for author:', currentAuthor.authorId);
    const structuredResult = await generateStructuredStory(userDescription, existingCharacters, imageData, audioData);// Update the story with the structured data
    const storyUpdates: Record<string, unknown> = {};
    if (structuredResult.story.title) storyUpdates.title = structuredResult.story.title;
    if (structuredResult.story.plotDescription) storyUpdates.plotDescription = structuredResult.story.plotDescription;
    if (structuredResult.story.synopsis) storyUpdates.synopsis = structuredResult.story.synopsis;
    if (structuredResult.story.place) storyUpdates.place = structuredResult.story.place;
    if (structuredResult.story.additionalRequests) storyUpdates.additionalRequests = structuredResult.story.additionalRequests;
    if (structuredResult.story.targetAudience) storyUpdates.targetAudience = structuredResult.story.targetAudience;
    if (structuredResult.story.novelStyle) storyUpdates.novelStyle = structuredResult.story.novelStyle;
    if (structuredResult.story.graphicalStyle) storyUpdates.graphicalStyle = structuredResult.story.graphicalStyle;

    const updatedStory = await storyService.updateStory(storyId, storyUpdates);

    // Process characters
    const processedCharacters = [];
    
    for (const character of structuredResult.characters) {
      let characterRecord;
      
      if (character.characterId) {
        // Use existing character
        characterRecord = await characterService.getCharacterById(character.characterId);
        if (!characterRecord) {        console.warn(`Character with ID ${character.characterId} not found, creating new one`);
          characterRecord = await characterService.createCharacter({
            name: character.name,
            authorId: currentAuthor.authorId,
            type: character.type || undefined,
            passions: character.passions || undefined,
            superpowers: character.superpowers || undefined,
            physicalDescription: character.physicalDescription || undefined,
            photoUrl: character.photoUrl || undefined,
          });
        }
      } else {
        // Create new character
        characterRecord = await characterService.createCharacter({
          name: character.name,
          authorId: currentAuthor.authorId,
          type: character.type || undefined,
          passions: character.passions || undefined,
          superpowers: character.superpowers || undefined,
          physicalDescription: character.physicalDescription || undefined,
          photoUrl: character.photoUrl || undefined,
        });
      }      // Link character to story
      try {
        await storyCharacterService.addCharacterToStory(
          storyId, 
          characterRecord.characterId, 
          character.role || undefined
        );      } catch (linkError) {
        // Character might already be linked to this story, which is fine
        console.warn(`Character ${characterRecord.characterId} might already be linked to story ${storyId}:`, linkError);
      }      processedCharacters.push({
        ...characterRecord,
        role: character.role || undefined
      });
    }

    console.log('Successfully structured story and processed characters');    return NextResponse.json({ 
      success: true,
      story: updatedStory,
      characters: processedCharacters,
      originalInput: userDescription,
      hasImageInput: !!imageData,
      hasAudioInput: !!audioData
    });

  } catch (error) {
    console.error('Error in GenAI story processing:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to process story with GenAI'
      },
      { status: 500 }
    );
  }
}
