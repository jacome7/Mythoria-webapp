import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService, storyGenerationRunService } from "@/db/services";
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

    // Create the story generation run
    const storyGenerationRun = await storyGenerationRunService.createStoryGenerationRun(
      validatedData.storyId,
      {
        features: validatedData.features,
        deliveryAddress: validatedData.deliveryAddress || undefined,
        dedicationMessage: validatedData.dedicationMessage || undefined,
      }
    );

    // Publish the Pub/Sub message to trigger the workflow
    try {
      await publishStoryRequest({
        storyId: validatedData.storyId,
        runId: storyGenerationRun.runId,
        timestamp: new Date().toISOString(),
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Story generation request published for story ${validatedData.storyId}, run ${storyGenerationRun.runId}`);
      }
    } catch (pubsubError) {
      console.error('Failed to publish story request:', pubsubError);
      
      // Update the run status to failed since we couldn't trigger the workflow
      await storyGenerationRunService.updateRunStatus(
        storyGenerationRun.runId, 
        'failed', 
        'publish_request', 
        `Failed to publish story request: ${pubsubError}`
      );
      
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
        runId: storyGenerationRun.runId,
        status: "queued" 
      },
      { status: 202 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
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
