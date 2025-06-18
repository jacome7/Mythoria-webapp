import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService } from "@/db/services";

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
    }

    return NextResponse.json({ 
      story,
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
