import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthor } from "@/lib/auth";
import { storyService } from "@/db/services";
import { sgwFetch, sgwUrl } from "@/lib/sgw-client";

// No-op: character role validation is handled on SGW

export async function POST(request: NextRequest) {
  try {
    // Get the current authenticated user
    const currentAuthor = await getCurrentAuthor();
    
    if (!currentAuthor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }    // Parse the request body
    const { userDescription, imageData, audioData, storyId, characterIds } = await request.json();

    if (!userDescription?.trim() && !imageData && !audioData) {
      return NextResponse.json(
        { error: 'Story description, image data, or audio data is required' },
        { status: 400 }
      );
    }

    if (!storyId) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Verify the story belongs to the current author
    const existingStory = await storyService.getStoryById(storyId);
    if (!existingStory || existingStory.authorId !== currentAuthor.authorId) {
      return NextResponse.json(
        { error: 'Story not found or access denied' },
        { status: 404 }
      );
    }

    // Get existing characters for this author
    // Proxy to SGW
  // const config = getEnvironmentConfig();
  const endpoint = sgwUrl('/ai/text/structure');

    // Log proxy details for debugging
    console.log('[genai-structure] Proxying to SGW', { endpoint, storyId, hasText: !!userDescription, hasImage: !!imageData, hasAudio: !!audioData, characterIdsCount: characterIds?.length || 0 });

    const payload: Record<string, unknown> = {
      storyId,
      userDescription,
      imageData,
      audioData,
      characterIds
    };
    // Strip null/undefined fields to avoid schema errors downstream
    Object.keys(payload).forEach((k) => {
      const key = k as keyof typeof payload;
      if (payload[key] === null || payload[key] === undefined) delete payload[key];
    });

    const workflowResponse = await sgwFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Try to parse JSON; if it fails, fall back to text for better error messages
    let data: unknown;
    const rawText = await workflowResponse.text();
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { raw: rawText };
    }

    if (!workflowResponse.ok) {
      console.error('[genai-structure] SGW error', { status: workflowResponse.status, body: data });
      return NextResponse.json(
        {
          error: 'Story-generation-workflow request failed',
          status: workflowResponse.status,
          endpoint,
          body: data
        },
        { status: workflowResponse.status }
      );
    }

  console.log('[genai-structure] SGW success');
  return NextResponse.json(data as Record<string, unknown>);

  } catch (error) {
    console.error('Error in GenAI story processing:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to process story with GenAI'
      },
      { status: 500 }
    );
  }
}
