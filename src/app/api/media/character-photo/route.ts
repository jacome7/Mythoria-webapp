import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { characterService } from '@/db/services';
import { sgwFetch } from '@/lib/sgw-client';

/**
 * POST /api/media/character-photo
 * Upload a character photo (already cropped and resized client-side to 768x768)
 *
 * Body: { characterId: string, dataUrl: string }
 * - dataUrl is a base64-encoded JPEG image
 */
export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { characterId, dataUrl } = body || {};

    if (!characterId || !dataUrl) {
      return NextResponse.json(
        { success: false, error: 'characterId and dataUrl are required' },
        { status: 400 },
      );
    }

    // Verify the character exists and belongs to this author
    const character = await characterService.getCharacterById(characterId);
    if (!character) {
      return NextResponse.json({ success: false, error: 'Character not found' }, { status: 404 });
    }
    if (character.authorId !== author.authorId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Delete old photo if it exists at a different path
    if (character.photoGcsUri) {
      try {
        await sgwFetch('/ai/media/character-photo', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gcsPath: character.photoGcsUri }),
        });
      } catch (err) {
        console.warn('Failed to delete old character photo:', err);
        // Continue anyway - not critical
      }
    }

    // Upload the new photo via SGW
    const resp = await sgwFetch('/ai/media/character-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorId: author.authorId,
        characterId,
        dataUrl,
      }),
    });

    const data = await resp.json();

    if (!resp.ok || !data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Upload failed' },
        { status: resp.status },
      );
    }

    // Update the character record with the new photo URL and GCS URI
    const updatedCharacter = await characterService.updateCharacterPhoto(
      characterId,
      data.publicUrl,
      data.gcsPath,
    );

    return NextResponse.json({
      success: true,
      photoUrl: data.publicUrl,
      photoGcsUri: data.gcsPath,
      character: updatedCharacter,
    });
  } catch (error) {
    console.error('Error uploading character photo:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/media/character-photo
 * Delete a character's photo
 *
 * Body: { characterId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { characterId } = body || {};

    if (!characterId) {
      return NextResponse.json(
        { success: false, error: 'characterId is required' },
        { status: 400 },
      );
    }

    // Verify the character exists and belongs to this author
    const character = await characterService.getCharacterById(characterId);
    if (!character) {
      return NextResponse.json({ success: false, error: 'Character not found' }, { status: 404 });
    }
    if (character.authorId !== author.authorId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Delete the photo from GCS via SGW if it exists
    if (character.photoGcsUri) {
      try {
        const resp = await sgwFetch('/ai/media/character-photo', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gcsPath: character.photoGcsUri }),
        });

        if (!resp.ok) {
          const errorData = await resp.json();
          console.warn('SGW delete response:', errorData);
        }
      } catch (err) {
        console.warn('Failed to delete character photo from GCS:', err);
        // Continue anyway - we'll still clear the DB reference
      }
    }

    // Clear the photo URL and GCS URI in the database
    const updatedCharacter = await characterService.updateCharacterPhoto(characterId, null, null);

    return NextResponse.json({
      success: true,
      character: updatedCharacter,
    });
  } catch (error) {
    console.error('Error deleting character photo:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
