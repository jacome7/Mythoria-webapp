import { NextResponse } from "next/server";
import { storyService } from "@/db/services";

export async function GET() {
  try {
    const featuredStories = await storyService.getFeaturedPublicStories();
    return NextResponse.json({ stories: featuredStories });
  } catch (error) {
    console.error("Error fetching featured stories:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured stories" },
      { status: 500 }
    );
  }
}
