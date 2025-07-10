import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService } from "@/db/services";
import { publishStoryRequest } from "@/lib/pubsub";
import { z } from "zod";

// Schema for validating story completion request
const completeStorySchema = z.object({
  storyId: z.string(),
  features: z.object({
    ebook: z.boolean(),
    printed: z.boolean(),
    audiobook: z.boolean(),
  }),
  deliveryAddress: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    stateRegion: z.string(),
    postalCode: z.string(),
    country: z.string(),
    phone: z.string().optional(),
  }).nullable().optional(),
  dedicationMessage: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    
    if (!author) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = completeStorySchema.parse(body);

    // Verify the story exists and belongs to the author
    const story = await storyService.getStoryById(validatedData.storyId);
    
    if (!story || story.authorId !== author.authorId) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }    // Start a database transaction
    await storyService.updateStory(validatedData.storyId, {
      status: 'writing' as const,
      features: validatedData.features,
      deliveryAddress: validatedData.deliveryAddress || undefined,
      dedicationMessage: validatedData.dedicationMessage || undefined,
    });

    // Generate a temporary runId for workflow tracking
    const { randomUUID } = await import('crypto');
    const runId = randomUUID();

    // Publish the Pub/Sub message to trigger the workflow
    try {
      await publishStoryRequest({
        storyId: validatedData.storyId,
        runId: runId,
        timestamp: new Date().toISOString(),
      });
      
      console.log(`Story generation request published for story ${validatedData.storyId}, run ${runId}`);
    } catch (pubsubError) {
      console.error('Failed to publish story request:', pubsubError);
      
      // Note: Story generation run tracking has been disabled
      console.log(`Run ${runId} failed - could not publish to workflow`);
      
      return NextResponse.json(
        { error: "Failed to start story generation workflow" },
        { status: 500 }
      );
    }

    // Return 202 Accepted (not 200) to indicate async processing
    return NextResponse.json(
      { 
        message: "Story generation started successfully",
        storyId: validatedData.storyId,
        runId: runId,
        status: "queued" 
      },
      { status: 202 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    
    console.error("Error completing story:", error);
    return NextResponse.json(
      { error: "Failed to complete story" },
      { status: 500 }
    );
  }
}
