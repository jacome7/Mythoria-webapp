import { getCurrentAuthor } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const author = await getCurrentAuthor();
    
    if (!author) {
      return NextResponse.json({ message: 'No authenticated user' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      author: {
        id: author.authorId,
        clerkUserId: author.clerkUserId,
        displayName: author.displayName,
        email: author.email,
        createdAt: author.createdAt
      }
    });
  } catch (error) {
    console.error('Error getting current author:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
