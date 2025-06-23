import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { authorService, aiEditService } from '@/db/services';

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
    const { action, storyId } = body;

    // Validate required fields
    if (!action || !['textEdit', 'imageEdit'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "textEdit" or "imageEdit"' },
        { status: 400 }
      );
    }

    if (!storyId) {
      return NextResponse.json(
        { success: false, error: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Check edit permission
    const permission = await aiEditService.checkEditPermission(author.authorId, action);

    return NextResponse.json({
      success: true,
      canEdit: permission.canEdit,
      requiredCredits: permission.requiredCredits,
      currentBalance: permission.currentBalance,
      editCount: permission.editCount,
      message: permission.message,
      // Provide additional context for the UI
      isFree: permission.requiredCredits === 0,
      nextThreshold: action === 'textEdit' 
        ? Math.ceil((permission.editCount + 1) / 5) * 5 
        : permission.editCount === 0 ? 1 : permission.editCount + 1
    });

  } catch (error) {
    console.error('Error in AI edit credit check API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
