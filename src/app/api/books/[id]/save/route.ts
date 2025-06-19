import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService } from "@/db/services";
import { Storage } from '@google-cloud/storage';
import { preserveMythoriaClasses, validateMythoriaClasses } from "@/utils/mythoriaClassPreserver";

// Initialize Google Cloud Storage
const storage = new Storage();
const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'mythoria-generated-stories';

async function uploadToGCS(filename: string, content: string): Promise<string> {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filename);

  await file.save(Buffer.from(content, 'utf-8'), {
    metadata: {
      contentType: 'text/html; charset=utf-8'
    }
  });

  return `https://storage.googleapis.com/${bucketName}/${filename}`;
}

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
    }

    // Generate filename for the updated story
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${storyId}/story-edited-${timestamp}.html`;    try {
      // Upload the edited HTML with preserved CSS classes to Google Cloud Storage
      const newHtmlUri = await uploadToGCS(filename, preservedHtml);

      // Update the story record with the new HTML URI
      await storyService.updateStory(storyId, {
        htmlUri: newHtmlUri,
        updatedAt: new Date()
      });

      console.log(`Story ${storyId} manually edited and saved to ${newHtmlUri}`);

      return NextResponse.json({ 
        success: true,
        message: "Story saved successfully",
        htmlUri: newHtmlUri
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
