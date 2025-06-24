import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { authors, stories, credits, tokenUsageTracking, addresses, events, storyGenerationRuns, storyGenerationSteps, shareLinks, storyCollaborators, storyVersions } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function DELETE() {
  try {
    const { userId } = await auth();
      if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`Account deletion requested for user: ${userId}`);

    // Get the author record first to verify ownership
    const [author] = await db.select({ authorId: authors.authorId })
      .from(authors)
      .where(eq(authors.clerkUserId, userId))
      .limit(1);    if (!author) {
      console.log(`User not found in database: ${userId}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log(`Starting account deletion process for author: ${author.authorId}`);

    // Start a transaction to ensure all data is deleted atomically
    await db.transaction(async (tx) => {
      // Get all story IDs for this author
      const userStories = await tx.select({ storyId: stories.storyId })
        .from(stories)
        .where(eq(stories.authorId, author.authorId));
      
      const storyIds = userStories.map(s => s.storyId);

      // Delete related data if there are stories
      if (storyIds.length > 0) {
        // Get all run IDs for these stories
        const storyRuns = await tx.select({ runId: storyGenerationRuns.runId })
          .from(storyGenerationRuns)
          .where(inArray(storyGenerationRuns.storyId, storyIds));
        
        const runIds = storyRuns.map(r => r.runId);

        // Delete story generation steps for all runs
        if (runIds.length > 0) {
          await tx.delete(storyGenerationSteps)
            .where(inArray(storyGenerationSteps.runId, runIds));
        }

        // Delete story generation runs
        await tx.delete(storyGenerationRuns)
          .where(inArray(storyGenerationRuns.storyId, storyIds));

        // Delete share links
        await tx.delete(shareLinks)
          .where(inArray(shareLinks.storyId, storyIds));

        // Delete story versions
        await tx.delete(storyVersions)
          .where(inArray(storyVersions.storyId, storyIds));
      }

      // Delete story collaborators
      await tx.delete(storyCollaborators)
        .where(eq(storyCollaborators.userId, author.authorId));

      // Delete events
      await tx.delete(events)
        .where(eq(events.authorId, author.authorId));

      // Delete addresses
      await tx.delete(addresses)
        .where(eq(addresses.authorId, author.authorId));

      // Delete stories (this will cascade to many related tables)
      await tx.delete(stories)
        .where(eq(stories.authorId, author.authorId));

      // Delete token usage tracking
      await tx.delete(tokenUsageTracking)
        .where(eq(tokenUsageTracking.authorId, author.authorId));

      // Delete credits
      await tx.delete(credits)
        .where(eq(credits.authorId, author.authorId));

      // Delete author record
      await tx.delete(authors)
        .where(eq(authors.authorId, author.authorId));
    });    // Delete user from Clerk
    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);

    console.log(`Account deletion completed successfully for user: ${userId}`);

    return NextResponse.json(
      { message: 'Account successfully deleted' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting account:', error);
    
    // Check if it's a Clerk error
    if (error && typeof error === 'object' && 'status' in error) {
      return NextResponse.json(
        { error: 'Failed to delete account from authentication system' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
