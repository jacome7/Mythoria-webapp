import { NextRequest, NextResponse } from "next/server";
import { storyService } from "@/db/services";

export async function GET(request: NextRequest) { 
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "count") {
    try {
      const totalStories = await storyService.getTotalStoriesCount();
      return NextResponse.json({ count: totalStories });
    } catch (error) {
      console.error("Error fetching total stories count:", error);
      return NextResponse.json(
        { error: "Failed to fetch total stories count" },
        { status: 500 }
      );
    }
  }

  // Original functionality to get published stories
  try {
    const stories = await storyService.getPublishedStories();
    return NextResponse.json({ stories });
  } catch (error) {
    console.error("Error fetching stories:", error);
    return NextResponse.json(
      { error: "Failed to fetch stories" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, authorId, plotDescription, storyLanguage, synopsis, customAuthor, dedicationMessage } = await request.json();
    
    if (!title || !authorId) {
      return NextResponse.json(
        { error: "Title and authorId are required" },
        { status: 400 }
      );
    }

    const story = await storyService.createStory({ title, authorId, plotDescription, storyLanguage, synopsis, customAuthor, dedicationMessage });
    return NextResponse.json({ story }, { status: 201 });
  } catch (error) {
    console.error("Error creating story:", error);
    return NextResponse.json(
      { error: "Failed to create story" },
      { status: 500 }
    );
  }
}
