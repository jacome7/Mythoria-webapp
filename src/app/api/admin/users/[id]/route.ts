import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { authors, stories, addresses, characters, storyCharacters, storyVersions, events, creditLedger, authorCreditBalances, paymentMethods } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { creditService } from '@/db/services';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is authenticated and authorized
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    const publicMetadata = user.publicMetadata as { [key: string]: string } | undefined;
    if (!publicMetadata || publicMetadata['autorizaçãoDeAcesso'] !== 'Comejá') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const authorId = resolvedParams.id;

    // Get user details
    const author = await db
      .select()
      .from(authors)
      .where(eq(authors.authorId, authorId))
      .limit(1);

    if (author.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const authorData = author[0];

    // Get user's stories
    const userStories = await db
      .select({
        storyId: stories.storyId,
        title: stories.title,
        status: stories.status,
        plotDescription: stories.plotDescription,
        synopsis: stories.synopsis,
        place: stories.place,
        targetAudience: stories.targetAudience,
        novelStyle: stories.novelStyle,
        graphicalStyle: stories.graphicalStyle,
        features: stories.features,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
      })
      .from(stories)
      .where(eq(stories.authorId, authorId))
      .orderBy(stories.createdAt);

    // Get user's addresses
    const userAddresses = await db
      .select()
      .from(addresses)
      .where(eq(addresses.authorId, authorId));

    // Get user's credit balance
    const credits = await creditService.getAuthorCreditBalance(authorId);

    return NextResponse.json({
      author: {
        ...authorData,
        credits,
      },
      stories: userStories,
      addresses: userAddresses,
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is authenticated and authorized
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    const publicMetadata = user.publicMetadata as { [key: string]: string } | undefined;
    if (!publicMetadata || publicMetadata['autorizaçãoDeAcesso'] !== 'Comejá') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const authorId = resolvedParams.id;

    // Check if the author exists
    const author = await db
      .select()
      .from(authors)
      .where(eq(authors.authorId, authorId))
      .limit(1);

    if (author.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }    // Delete in the correct order to avoid foreign key constraints
    // Start with dependent tables first

    // 1. Delete story-character relationships for user's stories
    const userStories = await db
      .select({ storyId: stories.storyId })
      .from(stories)
      .where(eq(stories.authorId, authorId));

    for (const story of userStories) {
      await db
        .delete(storyCharacters)
        .where(eq(storyCharacters.storyId, story.storyId));
    }

    // 2. Delete story versions (depends on stories)
    for (const story of userStories) {
      await db
        .delete(storyVersions)
        .where(eq(storyVersions.storyId, story.storyId));
    }

    // 3. Delete characters (depends on authors)
    await db
      .delete(characters)
      .where(eq(characters.authorId, authorId));

    // 4. Delete stories (depends on authors)
    await db
      .delete(stories)
      .where(eq(stories.authorId, authorId));

    // 5. Delete addresses (depends on authors)
    await db
      .delete(addresses)
      .where(eq(addresses.authorId, authorId));    // 6. Delete events related to this author
    await db
      .delete(events)
      .where(eq(events.authorId, authorId));    // 7. Delete payment methods
    await db
      .delete(paymentMethods)
      .where(eq(paymentMethods.authorId, authorId));

    // 8. Delete credit records
    await db
      .delete(creditLedger)
      .where(eq(creditLedger.authorId, authorId));

    await db
      .delete(authorCreditBalances)
      .where(eq(authorCreditBalances.authorId, authorId));

    // 9. Finally, delete the author
    await db
      .delete(authors)
      .where(eq(authors.authorId, authorId));

    return NextResponse.json({ 
      success: true, 
      message: 'User and all associated data deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ 
      error: 'Internal server error while deleting user' 
    }, { status: 500 });
  }
}
