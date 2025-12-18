import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { ensureStoryIdAccess, AccessDeniedError } from '@/lib/authorization';
import { chapterService } from '@/db/services'; // storyService accessed through ensureStoryIdAccess
import { getStoryImagesFromStorage } from '@/utils/storageUtils';

// Transform audiobookUri from database format to frontend format
function transformAudiobookUri(audiobookUri: unknown):
  | Array<{
      chapterTitle: string;
      audioUri: string;
      duration: number;
      imageUri?: string;
    }>
  | undefined {
  if (!audiobookUri || typeof audiobookUri !== 'object' || audiobookUri === null) {
    return undefined;
  }

  if (Array.isArray(audiobookUri)) {
    const normalized = audiobookUri
      .map((chapter, idx) => {
        if (!chapter || typeof chapter !== 'object') return null;
        const audioUri = (chapter as { audioUri?: unknown }).audioUri;
        if (typeof audioUri !== 'string') return null;

        const duration = (chapter as { duration?: unknown }).duration;
        const chapterTitle = (chapter as { chapterTitle?: unknown }).chapterTitle;
        const imageUri = (chapter as { imageUri?: unknown }).imageUri;

        return {
          chapterTitle:
            typeof chapterTitle === 'string' && chapterTitle.trim().length > 0
              ? chapterTitle
              : `Chapter ${idx + 1}`,
          audioUri,
          duration: typeof duration === 'number' && duration > 0 ? duration : 0,
          imageUri: typeof imageUri === 'string' && imageUri.length > 0 ? imageUri : undefined,
        };
      })
      .filter(Boolean) as Array<{
      chapterTitle: string;
      audioUri: string;
      duration: number;
      imageUri?: string;
    }>;

    return normalized.length > 0 ? normalized : undefined;
  }

  // Map format fallback: {"chapter_1": "url", "1": "url"}
  const audiobookData = audiobookUri as Record<string, unknown>;
  const chapters = [];

  let chapterKeys = Object.keys(audiobookData)
    .filter((key) => key.startsWith('chapter_'))
    .sort((a, b) => {
      const aNum = parseInt(a.replace('chapter_', ''));
      const bNum = parseInt(b.replace('chapter_', ''));
      return aNum - bNum;
    });

  if (chapterKeys.length === 0) {
    chapterKeys = Object.keys(audiobookData)
      .filter((key) => /^\d+$/.test(key))
      .sort((a, b) => parseInt(a) - parseInt(b));
  }

  for (const chapterKey of chapterKeys) {
    const chapterNumber = chapterKey.startsWith('chapter_')
      ? parseInt(chapterKey.replace('chapter_', ''))
      : parseInt(chapterKey);

    const audioUri = audiobookData[chapterKey];

    if (audioUri && typeof audioUri === 'string') {
      chapters.push({
        chapterTitle: `Chapter ${chapterNumber}`,
        audioUri,
        duration: 0,
        imageUri: undefined,
      });
    }
  }

  return chapters.length > 0 ? chapters : undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const { storyId } = await params;

    if (!storyId) {
      return NextResponse.json({ error: 'Story ID is required' }, { status: 400 });
    }

    // Check if user is authenticated
    const currentAuthor = await getCurrentAuthor();
    if (!currentAuthor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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
      audiobookUri: transformAudiobookUri(story.audiobookUri),
    };

    // Get chapters data for the story
    const chapters = await chapterService.getStoryChapters(storyId);

    // Get media links from Google Cloud Storage
    const mediaLinks = await getStoryImagesFromStorage(storyId);

    // (Removed verbose debug logging of mediaLinks and filenames)

    return NextResponse.json({
      story: transformedStory,
      chapters: chapters,
      mediaLinks: mediaLinks,
    });
  } catch (error) {
    console.error('Error fetching story:', error);
    return NextResponse.json({ error: 'Failed to fetch story' }, { status: 500 });
  }
}
