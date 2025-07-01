import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService } from "@/db/services";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;
    const currentAuthor = await getCurrentAuthor();

    if (!currentAuthor) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!storyId) {
      return NextResponse.json(
        { error: "Story ID is required" },
        { status: 400 }
      );
    }

    const { title } = await request.json();

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Check if the story exists and belongs to the current author
    const existingStory = await storyService.getStoryById(storyId);

    if (!existingStory) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }

    if (existingStory.authorId !== currentAuthor.authorId) {
      return NextResponse.json(
        { error: "You don't have permission to edit this story" },
        { status: 403 }
      );
    }

    // Update the story title
    const updatedStory = await storyService.updateStory(storyId, {
      title: title.trim(),
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      story: updatedStory,
      message: "Title updated successfully"
    });

  } catch (error) {
    console.error("Error updating story title:", error);
    return NextResponse.json(
      { error: "Failed to update story title" },
      { status: 500 }
    );
  }
}
