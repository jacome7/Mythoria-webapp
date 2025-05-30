import { NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService } from "@/db/services";

export async function GET() {
  try {
    const author = await getCurrentAuthor();
    
    if (!author) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const stories = await storyService.getStoriesByAuthor(author.authorId);
    return NextResponse.json({ stories });
  } catch (error) {
    console.error("Error fetching user stories:", error);
    return NextResponse.json(
      { error: "Failed to fetch stories" },
      { status: 500 }
    );
  }
}
