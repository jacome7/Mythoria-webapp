import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService } from "@/db/services";
import { preserveMythoriaClasses, validateMythoriaClasses } from "@/utils/mythoriaClassPreserver";
import { uploadNewVersion, rollbackUploadedFile, verifyStoryFileExists } from "@/utils/htmlVersioning";

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
    // Use versioning system to create a new version with atomic operation
    let versionResult: { version: number; uri: string; filename: string } | undefined;
    let rollbackRequired = false;
    
    try {
      // Upload the edited HTML with preserved CSS classes using versioning system
      console.log(`Starting atomic save operation for story ${storyId}`);
      versionResult = await uploadNewVersion(storyId, preservedHtml);
      rollbackRequired = true; // Mark that we may need to cleanup the uploaded file
      
      console.log(`Successfully uploaded ${versionResult.filename} to GCS`);

      // Update the story record with the new versioned HTML URI
      const updatedStory = await storyService.updateStory(storyId, {
        htmlUri: versionResult.uri,
        updatedAt: new Date()
      });

      if (!updatedStory) {
        throw new Error('Database update failed - story not found or update returned null');
      }      console.log(`Story ${storyId} manually edited and saved as version ${versionResult.version} at ${versionResult.uri}`);
      rollbackRequired = false; // Success - no cleanup needed

      // Final verification: ensure the file actually exists and database is consistent
      const verification = await verifyStoryFileExists(storyId, versionResult.uri);
      if (!verification.exists) {
        console.error(`CRITICAL: Database updated but file verification failed for ${versionResult.uri}:`, verification.error);
        // This is a critical inconsistency that should be logged for monitoring
      } else {
        console.log(`Verification successful: File exists in GCS (${verification.size} bytes)`);
      }

      return NextResponse.json({ 
        success: true,
        message: "Story saved successfully",
        htmlUri: versionResult.uri,
        version: versionResult.version,
        filename: versionResult.filename,
        verified: verification.exists
      });

    } catch (uploadError) {
      console.error('Error in atomic save operation for story', storyId, ':', uploadError);
      
      // If we successfully uploaded to GCS but failed to update the database,
      // we should attempt to clean up the uploaded file
      if (rollbackRequired && versionResult) {
        try {
          console.log(`Attempting to rollback uploaded file: ${versionResult.filename}`);
          await rollbackUploadedFile(storyId, versionResult.filename);
          console.log(`Successfully rolled back uploaded file: ${versionResult.filename}`);
        } catch (rollbackError) {
          console.error(`Failed to rollback uploaded file ${versionResult.filename}:`, rollbackError);
          // Log this for manual cleanup but don't fail the original error
        }
      }
      
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
