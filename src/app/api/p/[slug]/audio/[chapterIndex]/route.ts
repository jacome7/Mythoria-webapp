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
    
    // Check if the story has chapters with audio
    const hasAudio = storyData.chapters && Array.isArray(storyData.chapters) && 
                     storyData.chapters.some((chapter: { audioUri?: string }) => chapter.audioUri);
    
    if (!storyData.success || !hasAudio) {
      console.error('[Audio Proxy] Story does not have audio');
      return NextResponse.json(
        { error: 'Audio not available for this story' },
        { status: 404 }
      );
    }

    // Get the audio URL from the chapter's audioUri
    const chapterIdx = parseInt(chapterIndex);
    let audioUrl: string | null = null;

    // Find the chapter by index (chapters are returned in order)
    if (storyData.chapters && Array.isArray(storyData.chapters)) {
      const chapter = storyData.chapters[chapterIdx];
      if (chapter && chapter.audioUri) {
        audioUrl = chapter.audioUri;
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
