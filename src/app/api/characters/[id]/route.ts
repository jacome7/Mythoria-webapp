import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '../../../../lib/auth';
import { characterService } from '../../../../db/services';
import { db } from '../../../../db';
import { characters } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the current authenticated user
    const currentAuthor = await getCurrentAuthor();
    
    if (!currentAuthor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const characterId = resolvedParams.id;
    
    // Check if character exists and belongs to the current author
    const existingCharacter = await characterService.getCharacterById(characterId);
    
    if (!existingCharacter) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }
    
    if (existingCharacter.authorId !== currentAuthor.authorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse the request body
    const characterData = await request.json();

    // Validate required fields
    if (!characterData.name?.trim()) {
      return NextResponse.json(
        { error: 'Character name is required' },
        { status: 400 }
      );
    }    // Update the character
    const [updatedCharacter] = await db
      .update(characters)
      .set({
        name: characterData.name.trim(),
        type: characterData.type?.trim() || null,
        role: characterData.role?.trim() || null,
        passions: characterData.passions?.trim() || null,
        superpowers: characterData.superpowers?.trim() || null,
        physicalDescription: characterData.physicalDescription?.trim() || null,
        photoUrl: characterData.photoUrl?.trim() || null,
      })
      .where(eq(characters.characterId, characterId))
      .returning();

    return NextResponse.json({ 
      success: true, 
      character: updatedCharacter 
    });

  } catch (error) {
    console.error('Error updating character:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the current authenticated user
    const currentAuthor = await getCurrentAuthor();
    
    if (!currentAuthor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const characterId = resolvedParams.id;
    
    // Check if character exists and belongs to the current author
    const existingCharacter = await characterService.getCharacterById(characterId);
    
    if (!existingCharacter) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }
    
    if (existingCharacter.authorId !== currentAuthor.authorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the character
    await db
      .delete(characters)
      .where(eq(characters.characterId, characterId));

    return NextResponse.json({ 
      success: true, 
      message: 'Character deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
