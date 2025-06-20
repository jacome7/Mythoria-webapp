import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getEnvironmentConfig } from '../../../../config/environment';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { storyId, chapterNumber, userRequest } = body;

    // Validate required fields
    if (!storyId) {
      return NextResponse.json(
        { success: false, error: 'Story ID is required' },
        { status: 400 }
      );
    }

    if (!userRequest || typeof userRequest !== 'string') {
      return NextResponse.json(
        { success: false, error: 'User request is required' },
        { status: 400 }
      );
    }

    if (userRequest.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Request must be 2000 characters or less' },
        { status: 400 }
      );
    }

    // Get environment configuration
    const config = getEnvironmentConfig();
    const workflowUrl = config.storyGeneration.workflowUrl;    // Prepare request body for story generation workflow
    const workflowRequestBody: {
      storyId: string;
      userRequest: string;
      chapterNumber?: number;
    } = {
      storyId,
      userRequest: userRequest.trim()
    };

    if (chapterNumber && typeof chapterNumber === 'number') {
      workflowRequestBody.chapterNumber = chapterNumber;
    }

    // Make request to story generation workflow
    const workflowResponse = await fetch(`${workflowUrl}/story-edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflowRequestBody),
    });

    const workflowData = await workflowResponse.json();

    // Return the response from the workflow service
    if (workflowResponse.ok) {
      return NextResponse.json(workflowData);
    } else {
      return NextResponse.json(
        workflowData,
        { status: workflowResponse.status }
      );
    }

  } catch (error) {
    console.error('Error in story edit API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
