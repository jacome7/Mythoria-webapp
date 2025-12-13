import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { characterService } from '@/db/services';
import { sgwFetch } from '@/lib/sgw-client';

/**
 * POST /api/media/analyze-character-photo
 * Analyze a character photo using AI to extract a physical description
 *
 * Body: { characterId: string, dataUrl: string, locale: string }
 * - dataUrl is a base64-encoded JPEG image
 * - locale is the user's locale (e.g. 'en-US', 'pt-PT')
 *
 * Returns: { success: true, description: string } or { success: false, error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { characterId, dataUrl, locale } = body || {};

    if (!characterId || !dataUrl || !locale) {
      return NextResponse.json(
        { success: false, error: 'characterId, dataUrl, and locale are required' },
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

    // Call SGW to analyze the photo
    const resp = await sgwFetch('/ai/media/analyze-character-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl,
        locale,
      }),
    });

    const data = await resp.json();

    if (!resp.ok || !data.success) {
      // Check for timeout error
      if (resp.status === 504) {
        return NextResponse.json(
          { success: false, error: 'Analysis timed out. Please try again.' },
          { status: 504 },
        );
      }
      return NextResponse.json(
        { success: false, error: data.error || 'Analysis failed' },
        { status: resp.status },
      );
    }

    return NextResponse.json({
      success: true,
      description: data.description,
    });
  } catch (error) {
    console.error('Error analyzing character photo:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
