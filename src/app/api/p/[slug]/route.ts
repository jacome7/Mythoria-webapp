import { NextRequest, NextResponse } from "next/server";
import { chapterService, authorService } from "@/db/services";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { stories } from "@/db/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Story slug is required" },
        { status: 400 }
      );
    }

    // Find the story by slug
    const [story] = await db
      .select()
      .from(stories)
      .where(eq(stories.slug, slug));

    if (!story) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }

    // Check if story is public
    if (!story.isPublic) {
      return NextResponse.json(
        { error: "Story not available" },
        { status: 403 }
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

    // Get all chapters for this story
    const chapters = await chapterService.getStoryChapters(story.storyId);

    // Check if any chapters have audio
    const hasAudio = chapters.some(chapter => chapter.audioUri);

    // Transform story data for frontend
    const transformedStory = {
      storyId: story.storyId,
      title: story.title,
      authorName: story.customAuthor || author.displayName, // Use customAuthor if available, fallback to author.displayName
      dedicationMessage: story.dedicationMessage,
      targetAudience: story.targetAudience,
      graphicalStyle: story.graphicalStyle,
      coverUri: story.coverUri,
      backcoverUri: story.backcoverUri,
      synopsis: story.synopsis,
      createdAt: story.createdAt,
      isPublic: story.isPublic,
      slug: story.slug,
      hasAudio: hasAudio,
      audiobookUri: story.audiobookUri,
    };

    return NextResponse.json({ 
      success: true,
      story: transformedStory,
      chapters: chapters,
      accessLevel: 'public'
    });

  } catch (error) {
    console.error("Error fetching public story:", error);
    return NextResponse.json(
      { error: "Failed to fetch story" },
      { status: 500 }
    );
  }
}
