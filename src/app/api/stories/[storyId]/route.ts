import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { ensureStoryIdAccess, AccessDeniedError } from '@/lib/authorization';
import { chapterService } from "@/db/services"; // storyService accessed through ensureStoryIdAccess
import { getStoryImagesFromStorage } from "@/utils/storageUtils";

// Transform audiobookUri from database format to frontend format
function transformAudiobookUri(audiobookUri: unknown): Array<{
  chapterTitle: string;
  audioUri: string;
  duration: number;
  imageUri?: string;
}> | undefined {
  if (!audiobookUri || typeof audiobookUri !== 'object' || audiobookUri === null) {
    return undefined;
  }

  // Type assertion after validation
  const audiobookData = audiobookUri as Record<string, unknown>;

  // Database can store in two formats:
  // Format 1: {"chapter_1": "url", "chapter_2": "url", ...}
  // Format 2: {"1": "url", "2": "url", "3": "url", ...}
  // Frontend expects: [{chapterTitle: "Chapter 1", audioUri: "url", duration: 180}, ...]
  const chapters = [];
  
  // First, try to find chapter_ keys (Format 1)
  let chapterKeys = Object.keys(audiobookData)
    .filter(key => key.startsWith('chapter_'))
    .sort((a, b) => {
      const aNum = parseInt(a.replace('chapter_', ''));
      const bNum = parseInt(b.replace('chapter_', ''));
      return aNum - bNum;
    });

  // If no chapter_ keys found, try numeric keys (Format 2)
  if (chapterKeys.length === 0) {
    chapterKeys = Object.keys(audiobookData)
      .filter(key => /^\d+$/.test(key)) // Only numeric keys
      .sort((a, b) => parseInt(a) - parseInt(b)); // Sort numerically
  }

  for (const chapterKey of chapterKeys) {
    let chapterNumber: number;
    
    if (chapterKey.startsWith('chapter_')) {
      // Format 1: chapter_1, chapter_2, etc.
      chapterNumber = parseInt(chapterKey.replace('chapter_', ''));
    } else {
      // Format 2: 1, 2, 3, etc.
      chapterNumber = parseInt(chapterKey);
    }
    
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

    // Check if user is authenticated
    const currentAuthor = await getCurrentAuthor();
    if (!currentAuthor) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Enforce strict owner-only access on ID endpoints
    let story;
    try {
      story = await ensureStoryIdAccess(storyId, currentAuthor.authorId);
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      throw e;
    }
    
    // Transform audiobookUri from database format to frontend format
  const transformedStory = {
      ...story,
      audiobookUri: transformAudiobookUri(story.audiobookUri)
    };
    
    // Get chapters data for the story
    const chapters = await chapterService.getStoryChapters(storyId);
    
    // Get media links from Google Cloud Storage
    const mediaLinks = await getStoryImagesFromStorage(storyId);
    
    // Debug: Log the media links to see actual filenames
    console.log('API Route - Media links for story', storyId, ':', mediaLinks);
    console.log('API Route - Filenames:', Object.keys(mediaLinks || {}));

    return NextResponse.json({ 
      story: transformedStory,
      chapters: chapters,
      mediaLinks: mediaLinks
    });

  } catch (error) {
    console.error("Error fetching story:", error);
    return NextResponse.json(
      { error: "Failed to fetch story" },
      { status: 500 }
    );
  }
}
