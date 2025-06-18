import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { storyRatings, authors, stories } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { userId } = await auth();
    const { storyId } = await params;
    
    if (!storyId) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rating, feedback, includeNameInFeedback } = body;

    if (!rating || !['1', '2', '3', '4', '5'].includes(rating)) {
      return NextResponse.json(
        { error: 'Valid rating (1-5) is required' },
        { status: 400 }
      );
    }

    // Check if the story exists
    const story = await db.select()
      .from(stories)
      .where(eq(stories.storyId, storyId))
      .limit(1);

    if (!story.length) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    let authorId = null;
    
    // If user is authenticated, get their author record
    if (userId) {
      const author = await db.select()
        .from(authors)
        .where(eq(authors.clerkUserId, userId))
        .limit(1);
      
      if (author.length > 0) {
        authorId = author[0].authorId;
      }
    }

    // For ratings 1-3, feedback is optional but might be provided
    // For ratings 4-5, feedback is not expected but we'll accept it if provided
    const isAnonymous = !userId || !includeNameInFeedback;    const newRating = await db.insert(storyRatings).values({
      storyId,
      userId: authorId,
      rating: rating as '1' | '2' | '3' | '4' | '5',
      feedback: feedback || null,
      isAnonymous,
      includeNameInFeedback: includeNameInFeedback || false,
    }).returning();

    return NextResponse.json({
      success: true,
      rating: newRating[0],
      message: 'Rating submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting story rating:', error);
    
    // Check if the error is due to missing table
    if (error instanceof Error && error.message.includes('relation "story_ratings" does not exist')) {
      return NextResponse.json(
        { error: 'Rating system is currently being set up. Please try again later.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to submit rating' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;
    
    if (!storyId) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Get all ratings for the story (for statistics)
    const ratings = await db.select({
      ratingId: storyRatings.ratingId,
      rating: storyRatings.rating,
      feedback: storyRatings.feedback,
      isAnonymous: storyRatings.isAnonymous,
      includeNameInFeedback: storyRatings.includeNameInFeedback,
      createdAt: storyRatings.createdAt,
      displayName: authors.displayName,
    })
    .from(storyRatings)
    .leftJoin(authors, eq(storyRatings.userId, authors.authorId))
    .where(eq(storyRatings.storyId, storyId))
    .orderBy(storyRatings.createdAt);

    // Calculate statistics
    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0 
      ? ratings.reduce((sum: number, r) => sum + parseInt(r.rating), 0) / totalRatings
      : 0;

    const ratingDistribution = {
      5: ratings.filter((r) => r.rating === '5').length,
      4: ratings.filter((r) => r.rating === '4').length,
      3: ratings.filter((r) => r.rating === '3').length,
      2: ratings.filter((r) => r.rating === '2').length,
      1: ratings.filter((r) => r.rating === '1').length,
    };

    // Only return feedback for ratings with feedback and appropriate permissions
    const publicRatings = ratings.map((rating) => ({
      ratingId: rating.ratingId,
      rating: rating.rating,
      feedback: rating.feedback,
      isAnonymous: rating.isAnonymous,
      includeNameInFeedback: rating.includeNameInFeedback,
      authorName: !rating.isAnonymous && rating.includeNameInFeedback && rating.displayName 
        ? rating.displayName 
        : null,
      createdAt: rating.createdAt,
    }));

    return NextResponse.json({
      totalRatings,
      averageRating: Math.round(averageRating * 100) / 100,
      ratingDistribution,
      ratings: publicRatings,
    });
  } catch (error) {
    console.error('Error fetching story ratings:', error);
    
    // Check if the error is due to missing table
    if (error instanceof Error && error.message.includes('relation "story_ratings" does not exist')) {
      return NextResponse.json({
        totalRatings: 0,
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        ratings: [],
        message: 'Rating system is currently being set up'
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch ratings' },
      { status: 500 }
    );
  }
}
