import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService } from "@/db/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;

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

    // Fetch the story
    const story = await storyService.getStoryById(storyId);

    if (!story) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }

    // Only allow story owners to edit their stories
    if (story.authorId !== currentAuthor.authorId) {
      return NextResponse.json(
        { error: "Access denied. You can only edit your own stories." },
        { status: 403 }
      );
    }

    // Check if HTML content is available
    if (!story.htmlUri) {
      return NextResponse.json(
        { error: "Story content not available for editing" },
        { status: 404 }
      );
    }

    // Fetch story HTML content from Google Cloud Storage
    let storyHtmlContent = null;
    try {
      const contentResponse = await fetch(story.htmlUri);
      if (contentResponse.ok) {
        storyHtmlContent = await contentResponse.text();
      } else {
        console.warn(`Failed to fetch story content from ${story.htmlUri}:`, contentResponse.status);
        return NextResponse.json(
          { error: "Failed to fetch story content" },
          { status: 500 }
        );
      }
    } catch (contentError) {
      console.warn('Error fetching story content from Google Cloud Storage:', contentError);
      return NextResponse.json(
        { error: "Failed to fetch story content" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      html: storyHtmlContent,
      title: story.title,
      storyId: story.storyId
    });

  } catch (error) {
    console.error("Error fetching story HTML for editing:", error);
    return NextResponse.json(
      { error: "Failed to fetch story content" },
      { status: 500 }
    );
  }
}
