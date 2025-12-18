import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { ensureStoryIdAccess, AccessDeniedError } from '@/lib/authorization';
// storyService intentionally not imported; access handled via ensureStoryIdAccess

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string; chapterIndex: string }> },
) {
  try {
    const { storyId, chapterIndex } = await params;

    if (!storyId || !chapterIndex) {
      return NextResponse.json(
        { error: 'Story ID and chapter index are required' },
        { status: 400 },
      );
    }

    // Parse chapter index
    const chapterIdx = parseInt(chapterIndex);
    if (isNaN(chapterIdx) || chapterIdx < 0) {
      return NextResponse.json({ error: 'Invalid chapter index' }, { status: 400 });
    }

    // Check if user is authenticated
    const currentAuthor = await getCurrentAuthor();
    if (!currentAuthor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Enforce strict owner-only access
    let story;
    try {
      story = await ensureStoryIdAccess(storyId, currentAuthor.authorId);
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      throw e;
    }

    // Check if audiobook data exists
    if (
      !story.audiobookUri ||
      typeof story.audiobookUri !== 'object' ||
      story.audiobookUri === null
    ) {
      return NextResponse.json({ error: 'No audiobook available for this story' }, { status: 404 });
    }

    let audioUri: string | undefined;

    // Handle array format (new structured format)
    if (Array.isArray(story.audiobookUri)) {
      const chapter = story.audiobookUri[chapterIdx];
      if (chapter && typeof chapter === 'object' && 'audioUri' in chapter) {
        audioUri = (chapter as { audioUri?: unknown }).audioUri as string;
      }
    } else {
      // Handle map format (legacy format)
      const audiobookData = story.audiobookUri as Record<string, unknown>;

      // Format 1: chapter_1, chapter_2, etc.
      let chapterKey = `chapter_${chapterIdx + 1}`;
      audioUri = audiobookData[chapterKey] as string | undefined;

      // Format 2: 1, 2, 3, etc.
      if (!audioUri) {
        chapterKey = String(chapterIdx + 1);
        audioUri = audiobookData[chapterKey] as string | undefined;
      }
    }

    if (!audioUri || typeof audioUri !== 'string') {
      return NextResponse.json({ error: 'Chapter audio not found' }, { status: 404 });
    }

    // Fetch the audio file from Google Cloud Storage
    try {
      // Validate and fix URL protocol issues
      let finalAudioUri = audioUri;

      // Convert gs:// URLs to https:// URLs for Google Cloud Storage
      if (finalAudioUri.startsWith('gs://')) {
        console.log('[Authenticated Audio] Converting gs:// URL to https://');
        const gsPath = finalAudioUri.replace('gs://', '');
        const bucketAndPath = gsPath.split('/');
        const bucket = bucketAndPath[0];
        const path = bucketAndPath.slice(1).join('/');
        finalAudioUri = `https://storage.googleapis.com/${bucket}/${path}`;
      }

      // Check if the URL is HTTP and convert to HTTPS if needed
      if (finalAudioUri.startsWith('http://')) {
        console.warn('[Authenticated Audio] Converting HTTP URL to HTTPS:', finalAudioUri);
        finalAudioUri = finalAudioUri.replace('http://', 'https://');
      }

      console.log('[Authenticated Audio] Final URL:', finalAudioUri);

      const audioResponse = await fetch(finalAudioUri);

      if (!audioResponse.ok) {
        console.error(`Failed to fetch audio from ${audioUri}:`, audioResponse.status);
        return NextResponse.json({ error: 'Failed to fetch audio file' }, { status: 502 });
      }

      // Get the audio content
      const audioBuffer = await audioResponse.arrayBuffer();
      const audioUint8Array = new Uint8Array(audioBuffer);

      // Determine content type
      const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
      const contentLength = audioResponse.headers.get('content-length');

      // Create response with proper headers
      const response = new NextResponse(audioUint8Array, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          ...(contentLength && { 'Content-Length': contentLength }),
        },
      });

      return response;
    } catch (fetchError) {
      console.error('Error fetching audio file from Google Cloud Storage:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch audio file' }, { status: 502 });
    }
  } catch (error) {
    console.error('Error in audio proxy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
