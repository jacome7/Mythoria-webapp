import { NextRequest, NextResponse } from "next/server";
import { db } from '@/db';
import { stories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; chapterIndex: string }> }
) {
  try {
    const { slug, chapterIndex } = await params;

    if (!slug || !chapterIndex) {
      return NextResponse.json(
        { error: "Story slug and chapter index are required" },
        { status: 400 }
      );
    }

    // Parse chapter index
    const chapterIdx = parseInt(chapterIndex);
    if (isNaN(chapterIdx) || chapterIdx < 0) {
      return NextResponse.json(
        { error: "Invalid chapter index" },
        { status: 400 }
      );
    }

    // Get story by public slug
    const storyResult = await db
      .select({
        storyId: stories.storyId,
        audiobookUri: stories.audiobookUri,
        isPublic: stories.isPublic,
        status: stories.status,
      })
      .from(stories)
      .where(
        and(
          eq(stories.slug, slug),
          eq(stories.isPublic, true)
        )
      )
      .limit(1);

    if (!storyResult.length) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }

    const story = storyResult[0];

    // Check if story is public and published
    if (!story.isPublic || story.status !== 'published') {
      return NextResponse.json(
        { error: "Story is not publicly available" },
        { status: 403 }
      );
    }

    // Check if audiobook data exists
    if (!story.audiobookUri || typeof story.audiobookUri !== 'object' || story.audiobookUri === null) {
      return NextResponse.json(
        { error: "No audiobook available for this story" },
        { status: 404 }
      );
    }

    const audiobookData = story.audiobookUri as Record<string, unknown>;

    // Get the chapter audio URI - handle both key formats
    // Format 1: chapter_1, chapter_2, etc.
    // Format 2: 1, 2, 3, etc.
    let chapterKey = `chapter_${chapterIdx + 1}`;
    let audioUri = audiobookData[chapterKey];
    
    // If not found with chapter_ format, try numeric format
    if (!audioUri) {
      chapterKey = String(chapterIdx + 1);
      audioUri = audiobookData[chapterKey];
    }

    if (!audioUri || typeof audioUri !== 'string') {
      return NextResponse.json(
        { error: "Chapter audio not found" },
        { status: 404 }
      );
    }

    // Fetch the audio file from Google Cloud Storage
    try {
      const audioResponse = await fetch(audioUri);
      
      if (!audioResponse.ok) {
        console.error(`Failed to fetch audio from ${audioUri}:`, audioResponse.status);
        return NextResponse.json(
          { error: "Failed to fetch audio file" },
          { status: 502 }
        );
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
      return NextResponse.json(
        { error: "Failed to fetch audio file" },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error("Error in public audio proxy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
