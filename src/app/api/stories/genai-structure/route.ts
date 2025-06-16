import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { generateStructuredStory } from "@/lib/genai-story-structurer";
import { characterService, storyService, storyCharacterService, storyGenerationRunService } from "@/db/services";
import { mapStoryAttributes } from "@/lib/story-enum-mapping";
import { publishStoryRequest } from "@/lib/pubsub";

const isDev = process.env.NODE_ENV === 'development';

// Type guard for character role
function isValidCharacterRole(role: string): role is 'protagonist' | 'antagonist' | 'supporting' | 'mentor' | 'comic_relief' | 'love_interest' | 'sidekick' | 'narrator' | 'other' {
  return ['protagonist', 'antagonist', 'supporting', 'mentor', 'comic_relief', 'love_interest', 'sidekick', 'narrator', 'other'].includes(role);
}

export async function POST(request: NextRequest) {
  try {
    // Get the current authenticated user
    const currentAuthor = await getCurrentAuthor();
    
    if (!currentAuthor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }    // Parse the request body
    const { userDescription, imageData, audioData, storyId, userLanguage } = await request.json();

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
    if (isDev) {
      console.log('Calling GenAI to structure story for author:', currentAuthor.authorId, 'with language:', userLanguage || 'en-US');
    }
    const structuredResult = await generateStructuredStory(userDescription, existingCharacters, imageData, audioData, userLanguage || 'en-US');    // Update the story with the structured data
    const storyUpdates: Record<string, unknown> = {};
    if (structuredResult.story.title) storyUpdates.title = structuredResult.story.title;
    if (structuredResult.story.plotDescription) storyUpdates.plotDescription = structuredResult.story.plotDescription;
    if (structuredResult.story.synopsis) storyUpdates.synopsis = structuredResult.story.synopsis;
    if (structuredResult.story.place) storyUpdates.place = structuredResult.story.place;
    if (structuredResult.story.additionalRequests) storyUpdates.additionalRequests = structuredResult.story.additionalRequests;
    
    // Use smart mapping for enum fields
    const mappedAttributes = mapStoryAttributes({
      targetAudience: structuredResult.story.targetAudience,
      novelStyle: structuredResult.story.novelStyle,
      graphicalStyle: structuredResult.story.graphicalStyle,
    });
    
    if (mappedAttributes.targetAudience) storyUpdates.targetAudience = mappedAttributes.targetAudience;
    if (mappedAttributes.novelStyle) storyUpdates.novelStyle = mappedAttributes.novelStyle;
    if (mappedAttributes.graphicalStyle) storyUpdates.graphicalStyle = mappedAttributes.graphicalStyle;

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
            role: character.role && isValidCharacterRole(character.role) ? character.role : undefined,
            passions: character.passions || undefined,
            superpowers: character.superpowers || undefined,
            physicalDescription: character.physicalDescription || undefined,
            photoUrl: character.photoUrl || undefined,
          });
        }
      } else {        // Create new character
        characterRecord = await characterService.createCharacter({
          name: character.name,
          authorId: currentAuthor.authorId,
          type: character.type || undefined,
          role: character.role && isValidCharacterRole(character.role) ? character.role : undefined,
          passions: character.passions || undefined,
          superpowers: character.superpowers || undefined,
          physicalDescription: character.physicalDescription || undefined,
          photoUrl: character.photoUrl || undefined,
        });
      }      // Link character to story
      try {        await storyCharacterService.addCharacterToStory(
          storyId, 
          characterRecord.characterId, 
          character.role && isValidCharacterRole(character.role) ? character.role : undefined
        );} catch (linkError) {
        // Character might already be linked to this story, which is fine
        console.warn(`Character ${characterRecord.characterId} might already be linked to story ${storyId}:`, linkError);
      }      processedCharacters.push({
        ...characterRecord,
        role: character.role || undefined
      });    }

    if (isDev) {
      console.log('Successfully structured story and processed characters');
    }

    // 🚀 CREATE STORY GENERATION RUN AND TRIGGER WORKFLOW
    if (isDev) {
      console.log('📝 Creating story generation run for workflow trigger...');
    }
    try {
      // Create the story generation run
      const storyGenerationRun = await storyGenerationRunService.createStoryGenerationRun(
        storyId,
        {
          features: { ebook: true, printed: false, audiobook: false }, // Default features
          initiatedBy: 'genai-structure',
          originalPrompt: userDescription.substring(0, 500), // Store first 500 chars of original prompt
          hasImageInput: !!imageData,
          hasAudioInput: !!audioData
        }
      );

      if (isDev) {
        console.log('✅ Story generation run created:', {
          runId: storyGenerationRun.runId,
          storyId: storyId,
          status: storyGenerationRun.status
        });
      }

      // Publish Pub/Sub message to trigger the workflow
      if (isDev) {
        console.log('📢 Publishing Pub/Sub message to trigger workflow...');
      }
      await publishStoryRequest({
        storyId: storyId,
        runId: storyGenerationRun.runId,
        prompt: userDescription.substring(0, 1000) // Include prompt context for workflow
      });

      if (isDev) {
        console.log('✅ Pub/Sub message published successfully - workflow should be triggered');
      }

      // Return success response including the run information
      return NextResponse.json({ 
        success: true,
        story: updatedStory,
        characters: processedCharacters,
        originalInput: userDescription,
        hasImageInput: !!imageData,
        hasAudioInput: !!audioData,
        // Include workflow trigger information
        workflowTrigger: {
          runId: storyGenerationRun.runId,
          status: 'triggered',
          message: 'Story generation workflow has been triggered'
        }
      });

    } catch (workflowError) {
      console.error('❌ Failed to trigger story generation workflow:', workflowError);
      
      // Still return success for the story processing, but include workflow error
      return NextResponse.json({ 
        success: true,
        story: updatedStory,
        characters: processedCharacters,
        originalInput: userDescription,
        hasImageInput: !!imageData,
        hasAudioInput: !!audioData,
        // Include workflow error information
        workflowTrigger: {
          status: 'failed',
          error: workflowError instanceof Error ? workflowError.message : 'Failed to trigger workflow',
          message: 'Story was processed successfully, but workflow trigger failed'
        }
      });
    }

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
