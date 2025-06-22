import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService } from "@/db/services";
import { preserveMythoriaClasses, validateMythoriaClasses } from "@/utils/mythoriaClassPreserver";
import { uploadNewVersion } from "@/utils/htmlVersioning";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;
    const body = await request.json();
    const { html, source } = body;

    if (!storyId) {
      return NextResponse.json(
        { error: "Story ID is required" },
        { status: 400 }
      );
    }

    if (!html) {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 }
      );
    }

    if (source !== 'manual') {
      return NextResponse.json(
        { error: "Invalid source. Expected 'manual'" },
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
    }    // Only allow story owners to edit their stories
    if (story.authorId !== currentAuthor.authorId) {
      return NextResponse.json(
        { error: "Access denied. You can only edit your own stories." },
        { status: 403 }
      );
    }

    // Preserve Mythoria CSS classes to maintain styling
    const preservedHtml = preserveMythoriaClasses(html);
    
    // Validate class preservation and log warnings if needed
    const validation = validateMythoriaClasses(preservedHtml);
    if (!validation.isValid) {
      console.warn(`Story ${storyId}: Missing expected CSS classes:`, validation.missingElements);
      if (validation.warnings.length > 0) {
        console.warn(`Story ${storyId}: CSS class warnings:`, validation.warnings);
      }
    }    // Generate filename for the updated story
    // Use versioning system to create a new version
    try {
      // Upload the edited HTML with preserved CSS classes using versioning system
      const versionResult = await uploadNewVersion(storyId, preservedHtml);

      // Update the story record with the new versioned HTML URI
      await storyService.updateStory(storyId, {
        htmlUri: versionResult.uri,
        updatedAt: new Date()
      });

      console.log(`Story ${storyId} manually edited and saved as version ${versionResult.version} at ${versionResult.uri}`);

      return NextResponse.json({ 
        success: true,
        message: "Story saved successfully",
        htmlUri: versionResult.uri,
        version: versionResult.version,
        filename: versionResult.filename
      });

    } catch (uploadError) {
      console.error('Error uploading edited story to GCS:', uploadError);
      return NextResponse.json(
        { error: "Failed to save story content" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error saving edited story:", error);
    return NextResponse.json(
      { error: "Failed to save story" },
      { status: 500 }
    );
  }
}
