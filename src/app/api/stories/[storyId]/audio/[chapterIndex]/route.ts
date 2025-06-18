import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService } from "@/db/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string; chapterIndex: string }> }
) {
  try {
    const { storyId, chapterIndex } = await params;

    if (!storyId || !chapterIndex) {
      return NextResponse.json(
        { error: "Story ID and chapter index are required" },
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

    // Fetch the story
    const story = await storyService.getStoryById(storyId);

    if (!story) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }

    // Check if user is authenticated
    const currentAuthor = await getCurrentAuthor();
    if (!currentAuthor) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only allow access to published stories, or stories owned by the user
    if (story.status !== 'published' && story.authorId !== currentAuthor.authorId) {
      return NextResponse.json(
        { error: "Access denied. This story is not available for reading." },
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

    // Get the chapter audio URI
    const chapterKey = `chapter_${chapterIdx + 1}`;
    const audioUri = audiobookData[chapterKey];

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
    console.error("Error in audio proxy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
