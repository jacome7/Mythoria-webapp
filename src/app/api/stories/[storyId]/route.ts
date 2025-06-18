import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService } from "@/db/services";

// Transform audiobookUri from database format to frontend format
function transformAudiobookUri(audiobookUri: unknown): Array<{
  chapterTitle: string;
  audioUri: string;
  duration: number;
  imageUri?: string;
}> | undefined {  if (!audiobookUri || typeof audiobookUri !== 'object' || audiobookUri === null) {
    return undefined;
  }

  // Type assertion after validation
  const audiobookData = audiobookUri as Record<string, unknown>;

  // Database stores as: {"chapter_1": "url", "chapter_2": "url", ...}
  // Frontend expects: [{chapterTitle: "Chapter 1", audioUri: "url", duration: 180}, ...]
  const chapters = [];
    // Sort chapter keys to ensure proper order
  const chapterKeys = Object.keys(audiobookData)
    .filter(key => key.startsWith('chapter_'))
    .sort((a, b) => {
      const aNum = parseInt(a.replace('chapter_', ''));
      const bNum = parseInt(b.replace('chapter_', ''));
      return aNum - bNum;
    });

  for (const chapterKey of chapterKeys) {
    const chapterNumber = parseInt(chapterKey.replace('chapter_', ''));
    const audioUri = audiobookData[chapterKey];
    
    if (audioUri && typeof audioUri === 'string') {
      chapters.push({
        chapterTitle: `Chapter ${chapterNumber}`,
        audioUri: audioUri,
        duration: 180, // Default duration in seconds (3 minutes) - could be calculated from audio file in the future
        imageUri: undefined // Could be added in the future if chapter images are stored
      });
    }
  }

  return chapters.length > 0 ? chapters : undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;

    if (!storyId) {
      return NextResponse.json(
        { error: "Story ID is required" },
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
    }    // If it's published, anyone can read it
    // If it's the author's story, they can read it regardless of status
    
    // Fetch story HTML content from Google Cloud Storage if htmlUri is available
    let storyHtmlContent = null;
    if (story.htmlUri) {
      try {
        const contentResponse = await fetch(story.htmlUri);
        if (contentResponse.ok) {
          storyHtmlContent = await contentResponse.text();
        } else {
          console.warn(`Failed to fetch story content from ${story.htmlUri}:`, contentResponse.status);
        }
      } catch (contentError) {
        console.warn('Error fetching story content from Google Cloud Storage:', contentError);
      }
    }    // Transform audiobookUri from database format to frontend format
    const transformedStory = {
      ...story,
      audiobookUri: transformAudiobookUri(story.audiobookUri)
    };

    return NextResponse.json({ 
      story: transformedStory,
      htmlContent: storyHtmlContent 
    });

  } catch (error) {
    console.error("Error fetching story:", error);
    return NextResponse.json(
      { error: "Failed to fetch story" },
      { status: 500 }
    );
  }
}
