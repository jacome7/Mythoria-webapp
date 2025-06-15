import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { characterService } from '@/db/services';

export async function POST(request: NextRequest) {
  try {
    // Get the current authenticated user
    const currentAuthor = await getCurrentAuthor();
    
    if (!currentAuthor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse the request body
    const characterData = await request.json();

    // Validate required fields
    if (!characterData.name?.trim()) {
      return NextResponse.json(
        { error: 'Character name is required' },
        { status: 400 }
      );
    }    // Create the character
    const character = await characterService.createCharacter({
      name: characterData.name.trim(),
      authorId: currentAuthor.authorId,
      type: characterData.type?.trim() || null,
      role: characterData.role?.trim() || null,
      passions: characterData.passions?.trim() || null,
      superpowers: characterData.superpowers?.trim() || null,
      physicalDescription: characterData.physicalDescription?.trim() || null,
      photoUrl: characterData.photoUrl?.trim() || null,
    });

    return NextResponse.json({ 
      success: true, 
      character 
    });

  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get the current authenticated user
    const currentAuthor = await getCurrentAuthor();
    
    if (!currentAuthor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get all characters for this author
    const characters = await characterService.getCharactersByAuthor(currentAuthor.authorId);

    return NextResponse.json({ 
      success: true, 
      characters 
    });

  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
