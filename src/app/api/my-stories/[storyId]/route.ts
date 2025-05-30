import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService } from "@/db/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  try {
    const author = await getCurrentAuthor();
    
    if (!author) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const story = await storyService.getStoryById(storyId);
    
    if (!story || story.authorId !== author.authorId) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ story });
  } catch (error) {
    console.error("Error fetching story:", error);
    return NextResponse.json(
      { error: "Failed to fetch story" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  try {
    const author = await getCurrentAuthor();
    
    if (!author) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const story = await storyService.getStoryById(storyId);
    
    if (!story || story.authorId !== author.authorId) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }

    const updates = await request.json();
    const updatedStory = await storyService.updateStory(storyId, updates);
    
    return NextResponse.json({ story: updatedStory });
  } catch (error) {
    console.error("Error updating story:", error);
    return NextResponse.json(
      { error: "Failed to update story" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  try {
    const author = await getCurrentAuthor();
    
    if (!author) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const story = await storyService.getStoryById(storyId);
    
    if (!story || story.authorId !== author.authorId) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }

    await storyService.deleteStory(storyId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting story:", error);
    return NextResponse.json(
      { error: "Failed to delete story" },
      { status: 500 }
    );
  }
}
