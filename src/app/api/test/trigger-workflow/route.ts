/**
 * Test endpoint to manually trigger story generation workflow
 * This helps verify that the Pub/Sub -> Workflow integration is working
 * 
 * Usage: POST /api/test/trigger-workflow
 * Body: { "storyId": "<uuid>", "runId": "<uuid>" }
 */

import { NextRequest, NextResponse } from "next/server";
import { publishStoryRequest } from "@/lib/pubsub";
import { getCurrentAuthor } from "@/lib/auth";
import { storyGenerationRunService, storyService } from "@/db/services";

const isDev = process.env.NODE_ENV === 'development';

export async function POST(request: NextRequest) {
  try {
    const currentAuthor = await getCurrentAuthor();
    if (!currentAuthor) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { storyId, runId } = await request.json();

    if (!storyId) {
      return NextResponse.json(
        { error: 'storyId is required' },
        { status: 400 }
      );
    }

    // Verify the story exists and belongs to the current author
    const story = await storyService.getStoryById(storyId);
    if (!story || story.authorId !== currentAuthor.authorId) {
      return NextResponse.json(
        { error: 'Story not found or access denied' },
        { status: 404 }
      );
    }

    let actualRunId = runId;
    
    // If no runId provided, create a new run
    if (!actualRunId) {
      if (isDev) {
        console.log('📝 Creating new story generation run for test trigger...');
      }
      const storyGenerationRun = await storyGenerationRunService.createStoryGenerationRun(
        storyId,
        {
          features: { ebook: true, printed: false, audiobook: false },
          initiatedBy: 'manual-test-trigger',
          testTrigger: true
        }
      );
      actualRunId = storyGenerationRun.runId;
      if (isDev) {
        console.log('✅ Test run created:', actualRunId);
      }
    }

    // Publish Pub/Sub message to trigger the workflow
    if (isDev) {
      console.log('📢 Publishing test Pub/Sub message to trigger workflow...');
    }
    const messageId = await publishStoryRequest({
      storyId: storyId,
      runId: actualRunId,
      testTrigger: true,
      timestamp: new Date().toISOString()
    });

    if (isDev) {
      console.log('✅ Test Pub/Sub message published successfully');
    }

    return NextResponse.json({
      success: true,
      message: 'Workflow trigger test completed successfully',
      data: {
        storyId,
        runId: actualRunId,
        messageId,
        pubsubTopic: process.env.PUBSUB_TOPIC,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Test workflow trigger failed:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to trigger test workflow'
      },
      { status: 500 }
    );
  }
}
