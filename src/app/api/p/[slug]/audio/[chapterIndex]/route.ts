import { NextRequest, NextResponse } from 'next/server';
import { chapterService } from '@/db/services';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { stories } from '@/db/schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; chapterIndex: string }> },
) {
  try {
    const { slug, chapterIndex } = await params;

    console.log('[Audio Proxy] Fetching audio for slug:', slug, 'chapter:', chapterIndex);

    // Parse chapter index first
    const chapterIdx = parseInt(chapterIndex);
    if (isNaN(chapterIdx) || chapterIdx < 0) {
      return NextResponse.json({ error: 'Invalid chapter index' }, { status: 400 });
    }

    // Get story data directly from database (same as authenticated API)
    const [story] = await db.select().from(stories).where(eq(stories.slug, slug));

    if (!story) {
      console.error('[Audio Proxy] Story not found');
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Check if story is public
    if (!story.isPublic) {
      console.error('[Audio Proxy] Story not public');
      return NextResponse.json({ error: 'Story not available' }, { status: 403 });
    }

    // Get chapters for this story
    const chapters = await chapterService.getStoryChapters(story.storyId);
    console.log('[Audio Proxy] Found chapters:', chapters.length);

    let audioUrl: string | null = null;

    // First, try to get audio from individual chapter audioUri (preferred for public stories)
    if (chapters && Array.isArray(chapters)) {
      console.log('[Audio Proxy] Checking chapters array for audio, length:', chapters.length);
      const chapter = chapters[chapterIdx];
      if (chapter && chapter.audioUri) {
        audioUrl = chapter.audioUri;
        console.log('[Audio Proxy] Found audio in chapter.audioUri:', audioUrl);
      } else {
        console.log('[Audio Proxy] No audioUri in chapter at index:', chapterIdx);
      }
    }

    // If not found in chapters, try the story-level audiobookUri (fallback)
    if (!audioUrl && story.audiobookUri) {
      console.log('[Audio Proxy] Trying story-level audiobookUri fallback');
      const audiobookData = story.audiobookUri;

      if (typeof audiobookData === 'object' && audiobookData !== null) {
        console.log('[Audio Proxy] audiobookData is object, keys:', Object.keys(audiobookData));
        // Try chapter_ format first (Format 1)
        let chapterKey = `chapter_${chapterIdx + 1}`;
        audioUrl = (audiobookData as Record<string, unknown>)[chapterKey] as string;
        console.log('[Audio Proxy] Tried key', chapterKey, 'result:', audioUrl);

        // If not found with chapter_ format, try numeric format (Format 2)
        if (!audioUrl) {
          chapterKey = String(chapterIdx + 1);
          audioUrl = (audiobookData as Record<string, unknown>)[chapterKey] as string;
          console.log('[Audio Proxy] Tried numeric key', chapterKey, 'result:', audioUrl);
        }
      } else {
        console.log('[Audio Proxy] audiobookData is not object or null:', typeof audiobookData);
      }
    } else if (!audioUrl) {
      console.log('[Audio Proxy] No story.audiobookUri available');
    }

    if (!audioUrl) {
      console.error('[Audio Proxy] Audio URL not found for chapter:', chapterIndex);
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
    }

    console.log('[Audio Proxy] Original audio URL found:', audioUrl);

    // Validate and fix URL protocol issues
    let finalAudioUrl = audioUrl;

    // Convert gs:// URLs to https:// URLs for Google Cloud Storage
    if (finalAudioUrl.startsWith('gs://')) {
      console.log('[Audio Proxy] Converting gs:// URL to https://');
      const gsPath = finalAudioUrl.replace('gs://', '');
      const bucketAndPath = gsPath.split('/');
      const bucket = bucketAndPath[0];
      const path = bucketAndPath.slice(1).join('/');
      finalAudioUrl = `https://storage.googleapis.com/${bucket}/${path}`;
      console.log('[Audio Proxy] Converted gs:// to https://:', finalAudioUrl);
    }

    // Check if the URL is HTTP and convert to HTTPS if needed
    if (finalAudioUrl.startsWith('http://')) {
      console.warn('[Audio Proxy] Converting HTTP URL to HTTPS:', finalAudioUrl);
      finalAudioUrl = finalAudioUrl.replace('http://', 'https://');
    }

    // Log final URL for debugging (matching authenticated API format)
    console.log('[Audio Proxy] Final URL:', finalAudioUrl);

    // Fetch the audio file (using same approach as authenticated API)
    const audioResponse = await fetch(finalAudioUrl);

    if (!audioResponse.ok) {
      console.error(`[Audio Proxy] Failed to fetch audio from ${audioUrl}:`, audioResponse.status);
      return NextResponse.json({ error: 'Failed to load audio file' }, { status: 500 });
    }

    // Get the audio data and convert to Uint8Array (same as authenticated API)
    const audioBuffer = await audioResponse.arrayBuffer();
    const audioUint8Array = new Uint8Array(audioBuffer);

    // Determine content type
    const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
    const contentLength = audioResponse.headers.get('content-length');

    // Return the audio with appropriate headers (same as authenticated API)
    return new NextResponse(audioUint8Array, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        ...(contentLength && { 'Content-Length': contentLength }),
      },
    });
  } catch (error) {
    console.error('[Audio Proxy] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
