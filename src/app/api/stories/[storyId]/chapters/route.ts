import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { ensureStoryIdAccess, AccessDeniedError } from '@/lib/authorization';
import { chapterService, authorService } from "@/db/services"; // storyService not needed directly

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

    // Get author information
  const author = await authorService.getAuthorById(story.authorId);
    if (!author) {
      return NextResponse.json(
        { error: "Author not found" },
        { status: 404 }
      );
    }

    // Get all chapters for this story
    const chapters = await chapterService.getStoryChapters(storyId);

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
      chapters: chapters
    });

  } catch (error) {
    console.error("Error fetching story chapters:", error);
    return NextResponse.json(
      { error: "Failed to fetch story chapters" },
      { status: 500 }
    );
  }
}
