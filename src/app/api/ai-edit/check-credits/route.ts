import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { authorService, aiEditService } from '@/db/services';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Credit check request started');
    
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      console.log('❌ Credit check failed: No userId');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the current user
    const author = await authorService.getAuthorByClerkId(userId);
    if (!author) {
      console.log('❌ Credit check failed: Author not found for userId:', userId);
      return NextResponse.json(
        { success: false, error: 'Author not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { action, storyId } = body;
    
    console.log('📋 Credit check request body:', { action, storyId, authorId: author.authorId });

    // Validate required fields
    if (!action || !['textEdit', 'imageEdit'].includes(action)) {
      console.log('❌ Credit check failed: Invalid action:', action);
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "textEdit" or "imageEdit"' },
        { status: 400 }
      );
    }

    if (!storyId) {
      console.log('❌ Credit check failed: Missing storyId');
      return NextResponse.json(
        { success: false, error: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Check edit permission
    console.log('🔄 Checking edit permission for author:', author.authorId, 'action:', action);
    const permission = await aiEditService.checkEditPermission(author.authorId, action);
    
    console.log('✅ Credit check successful:', {
      canEdit: permission.canEdit,
      requiredCredits: permission.requiredCredits,
      currentBalance: permission.currentBalance,
      editCount: permission.editCount
    });

    return NextResponse.json({
      success: true,
      canEdit: permission.canEdit,
      requiredCredits: permission.requiredCredits,
      currentBalance: permission.currentBalance,
      editCount: permission.editCount,
      message: permission.message,
      nextThreshold: permission.nextThreshold,
      isFree: permission.isFree
    });

  } catch (error) {
    console.error('💥 Error in credit check API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
