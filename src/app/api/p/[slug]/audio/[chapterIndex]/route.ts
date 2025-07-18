import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; chapterIndex: string }> }
) {
  try {
    const { slug, chapterIndex } = await params;
    
    console.log('[Audio Proxy] Fetching audio for slug:', slug, 'chapter:', chapterIndex);

    // First, get the story data to verify it's public and has audio
    const storyResponse = await fetch(`${request.nextUrl.origin}/api/p/${slug}`, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
    });

    if (!storyResponse.ok) {
      console.error('[Audio Proxy] Failed to fetch story data');
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    const storyData = await storyResponse.json();
    
    if (!storyData.success || !storyData.story.hasAudio) {
      console.error('[Audio Proxy] Story does not have audio');
      return NextResponse.json(
        { error: 'Audio not available for this story' },
        { status: 404 }
      );
    }

    // Get the audio URL from the audiobookUri
    const audiobookUri = storyData.story.audiobookUri;
    let audioUrl: string | null = null;

    if (Array.isArray(audiobookUri)) {
      const chapterIdx = parseInt(chapterIndex);
      if (chapterIdx >= 0 && chapterIdx < audiobookUri.length) {
        audioUrl = audiobookUri[chapterIdx].audioUri;
      }
    } else if (typeof audiobookUri === 'object' && audiobookUri) {
      const audiobookData = audiobookUri as Record<string, string>;
      
      // Try chapter_ format first
      const chapterKey = `chapter_${parseInt(chapterIndex) + 1}`;
      if (audiobookData[chapterKey]) {
        audioUrl = audiobookData[chapterKey];
      } else {
        // Try numeric format
        const numericKey = (parseInt(chapterIndex) + 1).toString();
        if (audiobookData[numericKey]) {
          audioUrl = audiobookData[numericKey];
        }
      }
    }

    if (!audioUrl) {
      console.error('[Audio Proxy] Audio URL not found for chapter:', chapterIndex);
      return NextResponse.json(
        { error: 'Audio file not found' },
        { status: 404 }
      );
    }

    console.log('[Audio Proxy] Proxying audio from:', audioUrl);

    // Fetch the audio file
    const audioResponse = await fetch(audioUrl);
    
    if (!audioResponse.ok) {
      console.error('[Audio Proxy] Failed to fetch audio file:', audioResponse.status);
      return NextResponse.json(
        { error: 'Failed to load audio file' },
        { status: 500 }
      );
    }

    // Get the audio data
    const audioBuffer = await audioResponse.arrayBuffer();
    
    // Return the audio with appropriate headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': audioResponse.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Length': audioResponse.headers.get('Content-Length') || audioBuffer.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('[Audio Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
