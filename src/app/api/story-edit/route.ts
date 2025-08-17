import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getEnvironmentConfig } from '../../../../config/environment';
import { authorService, aiEditService, chapterService } from '@/db/services';
import { sgwFetch } from '@/lib/sgw-client';

export async function POST(request: NextRequest) {
  try {    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the current user
    const author = await authorService.getAuthorByClerkId(userId);
    if (!author) {
      return NextResponse.json(
        { success: false, error: 'Author not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { storyId, chapterNumber, userRequest, scope } = body;

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

    // Validate scope if provided
    if (scope && !['chapter', 'story'].includes(scope)) {
      return NextResponse.json(
        { success: false, error: 'Scope must be "chapter" or "story"' },
        { status: 400 }
      );
    }

    // Get environment configuration
    const config = getEnvironmentConfig();
  const workflowUrl = config.storyGeneration.workflowUrl;    // Determine the appropriate endpoint based on scope
    let endpoint: string;
    const method = 'PATCH';
    
    if (scope === 'story' || (!chapterNumber && !scope)) {
      // Edit entire story
      endpoint = `${workflowUrl}/story-edit/stories/${storyId}/chapters`;
    } else {
      // Edit specific chapter
      endpoint = `${workflowUrl}/story-edit/stories/${storyId}/chapters/${chapterNumber}`;
    }

    // Prepare request body for the new RESTful API
    const workflowRequestBody = {
      userRequest: userRequest.trim()
    };

    // Make request to story generation workflow using new RESTful endpoint
    let workflowResponse: Response;
    let workflowData: unknown;
    
    try {
      workflowResponse = await sgwFetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowRequestBody),
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      workflowData = await workflowResponse.json();
    } catch (error: unknown) {
      console.error('Error connecting to story generation workflow:', error);
      
      // Check if this is a connection error
      const errorWithCode = error as { code?: string; name?: string };
      if (errorWithCode.code === 'ECONNREFUSED' || errorWithCode.name === 'ConnectTimeoutError' || errorWithCode.name === 'TimeoutError') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Story editing service is currently unavailable. Please try again later.',
            details: config.isDevelopment ? `Connection refused to ${workflowUrl}. Make sure the story generation workflow service is running.` : undefined
          },
          { status: 503 } // Service Unavailable
        );
      }
      
      // For other errors, return generic error
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to process story edit request. Please try again.',
          details: config.isDevelopment ? (error as Error).message : undefined
        },
        { status: 500 }
      );
    }

    // Handle successful response
    const workflowResult = workflowData as {
      success?: boolean;
      editedContent?: string;
      editedChapters?: Array<{ 
        chapterNumber: number; 
        editedContent: string; 
        originalLength: number; 
        editedLength: number; 
        error?: string;
      }>;
      metadata?: { tokensUsed?: number; totalChapters?: number; successfulEdits?: number };
    };

    if (workflowResponse.ok && workflowResult.success) {
      // Update database with new content and record edits
      try {
        const updatedChapters: Array<{
          chapterNumber: number;
          success: boolean;
          error?: string;
        }> = [];

        if (scope === 'story' || (!chapterNumber && !scope)) {
          // Handle full story edit - update all chapters and record individual edits
          if (workflowResult.editedChapters && Array.isArray(workflowResult.editedChapters)) {
            for (const chapter of workflowResult.editedChapters) {
              try {
                if (chapter.editedContent && typeof chapter.editedContent === 'string' && !chapter.error) {
                  // Update chapter content in database
                  await chapterService.updateChapterContent(
                    storyId, 
                    chapter.chapterNumber, 
                    chapter.editedContent
                  );

                  // Record successful edit for this chapter
                  await aiEditService.recordSuccessfulEdit(
                    author.authorId,
                    storyId,
                    'textEdit',
                    {
                      chapterNumber: chapter.chapterNumber,
                      userRequest: userRequest.trim(),
                      timestamp: new Date().toISOString(),
                      originalLength: chapter.originalLength,
                      editedLength: chapter.editedLength
                    }
                  );

                  updatedChapters.push({
                    chapterNumber: chapter.chapterNumber,
                    success: true
                  });
                } else {
                  // Chapter had an error during editing
                  updatedChapters.push({
                    chapterNumber: chapter.chapterNumber,
                    success: false,
                    error: chapter.error || 'Unknown error during editing'
                  });
                }
              } catch (chapterError) {
                console.error(`Error updating chapter ${chapter.chapterNumber}:`, chapterError);
                updatedChapters.push({
                  chapterNumber: chapter.chapterNumber,
                  success: false,
                  error: 'Failed to save chapter to database'
                });
              }
            }
          }

          // Return full story edit response
          return NextResponse.json({
            success: true,
            scope: 'story',
            updatedChapters,
            totalChapters: workflowResult.metadata?.totalChapters || updatedChapters.length,
            successfulEdits: updatedChapters.filter(ch => ch.success).length,
            failedEdits: updatedChapters.filter(ch => !ch.success).length,
            tokensUsed: workflowResult.metadata?.tokensUsed || 0,
            timestamp: new Date().toISOString()
          });
        } else {
          // Handle single chapter edit
          if (workflowResult.editedContent) {
            await chapterService.updateChapterContent(
              storyId, 
              chapterNumber, 
              workflowResult.editedContent
            );

            // Record the single edit
            await aiEditService.recordSuccessfulEdit(
              author.authorId,
              storyId,
              'textEdit',
              {
                chapterNumber: chapterNumber,
                userRequest: userRequest.trim(),
                timestamp: new Date().toISOString()
              }
            );
          }

          // Return single chapter edit response
          return NextResponse.json({
            success: true,
            scope: 'chapter',
            updatedHtml: workflowResult.editedContent || 'Content updated successfully',
            tokensUsed: workflowResult.metadata?.tokensUsed || 0,
            chapterNumber: chapterNumber
          });
        }

      } catch (dbError) {
        console.error('Error updating database:', dbError);
        return NextResponse.json(
          { success: false, error: 'Content generated but failed to save to database' },
          { status: 500 }
        );
      }
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
