import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService, chapterService, authorService } from "@/db/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string; chapterNumber: string }> }
) {
  try {
    const { storyId, chapterNumber } = await params;

    if (!storyId || !chapterNumber) {
      return NextResponse.json(
        { error: "Story ID and chapter number are required" },
        { status: 400 }
      );
    }

    const chapterNum = parseInt(chapterNumber);
    if (isNaN(chapterNum) || chapterNum < 1) {
      return NextResponse.json(
        { error: "Invalid chapter number" },
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

    // Get the specific chapter
    const chapter = await chapterService.getStoryChapter(storyId, chapterNum);

    if (!chapter) {
      return NextResponse.json(
        { error: "Chapter not found" },
        { status: 404 }
      );
    }

    // Get author information
    const author = await authorService.getAuthorById(story.authorId);
    if (!author) {
      return NextResponse.json(
        { error: "Author not found" },
        { status: 404 }
      );
    }

    // Get all chapters for navigation
    const allChapters = await chapterService.getStoryChapters(storyId);

    // Transform story data for frontend
    const transformedStory = {
      title: story.title,
      authorName: story.customAuthor || author.displayName, // Use customAuthor if available, fallback to author.displayName
      dedicationMessage: story.dedicationMessage,
      targetAudience: story.targetAudience,
      graphicalStyle: story.graphicalStyle,
      coverUri: story.coverUri,
      backcoverUri: story.backcoverUri,
    };

    return NextResponse.json({ 
      story: transformedStory,
      chapters: allChapters,
      currentChapter: chapter
    });

  } catch (error) {
    console.error("Error fetching story chapter:", error);
    return NextResponse.json(
      { error: "Failed to fetch story chapter" },
      { status: 500 }
    );
  }
}
