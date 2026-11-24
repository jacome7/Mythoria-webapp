import { NextResponse } from 'next/server';
import { CONSENT_COOKIE_NAME } from '@/lib/consent';
import { readAnalyticsConsentCookie } from '@/lib/analytics/consent-server';
import { cookiesFromHeaders } from '@/lib/openai-ads/context';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { stories, shareLinks, storyCollaborators, authors } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { authorService } from '@/db/services';
import { hasPremiumBookMarker } from '@/lib/premium-children-book/contract';
import { toPremiumBookReaderData } from '@/lib/premium-children-book/reader';
import { loadPublishedPremiumBook } from '@/lib/premium-children-book/storage';

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const { userId } = await auth();

    // Find the share link
    const shareLink = await db
      .select({
        id: shareLinks.id,
        storyId: shareLinks.storyId,
        accessLevel: shareLinks.accessLevel,
        expiresAt: shareLinks.expiresAt,
        revoked: shareLinks.revoked,
        features: stories.features,
        storyStatus: stories.status,
        story: {
          storyId: stories.storyId,
          title: stories.title,
          synopsis: stories.synopsis,
          audiobookUri: stories.audiobookUri,
          targetAudience: stories.targetAudience,
          graphicalStyle: stories.graphicalStyle,
          coverUri: stories.coverUri,
          createdAt: stories.createdAt,
          authorId: stories.authorId,
        },
        author: {
          displayName: authors.displayName,
        },
      })
      .from(shareLinks)
      .leftJoin(stories, eq(stories.storyId, shareLinks.storyId))
      .leftJoin(authors, eq(authors.authorId, stories.authorId))
      .where(eq(shareLinks.id, token))
      .limit(1);

    if (!shareLink.length) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    const link = shareLink[0];
    const isPremiumBook = hasPremiumBookMarker(link.features);

    // Check if link is expired or revoked
    if (link.revoked || new Date(link.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Share link has expired or been revoked' },
        { status: 410 },
      );
    }
    if (isPremiumBook && link.storyStatus !== 'published') {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // For edit and view links, authentication is required
    if ((link.accessLevel === 'edit' || link.accessLevel === 'view') && !userId) {
      return NextResponse.json(
        {
          success: false,
          requiresAuth: true,
          storyPreview: {
            title: link.story?.title || 'Untitled Story',
            synopsis: link.story?.synopsis || '',
            authorName: link.author?.displayName || 'Unknown Author',
            coverUri: isPremiumBook ? undefined : link.story?.coverUri || undefined,
            targetAudience: link.story?.targetAudience || undefined,
            graphicalStyle: link.story?.graphicalStyle || undefined,
          },
          accessLevel: link.accessLevel,
        },
        { status: 401 },
      );
    }

    if (isPremiumBook && link.story) {
      const book = await loadPublishedPremiumBook(link.storyId, link.story.authorId, link.features);
      if (!book) return NextResponse.json({ error: 'Story unavailable' }, { status: 503 });
      return NextResponse.json(
        { success: true, premiumBook: toPremiumBookReaderData(book, token) },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    // Get current user's author ID for collaborator management
    let currentAuthorId: string | null = null;

    if (userId) {
      // First try to find existing user
      const existingAuthor = await db
        .select()
        .from(authors)
        .where(eq(authors.clerkUserId, userId))
        .limit(1);

      if (!existingAuthor.length) {
        // User doesn't exist in authors table, create them or update existing with new clerkUserId
        console.log('Creating/updating author for user accessing shared link:', userId);

        try {
          // Get user details from Clerk
          const clerkUser = await currentUser();
          if (!clerkUser) {
            return NextResponse.json({ error: 'Unable to get user details' }, { status: 401 });
          }

          // Use syncUserOnSignIn which handles both creation and updating existing users
          const author = await authorService.syncUserOnSignIn({
            id: userId,
            emailAddresses:
              clerkUser.emailAddresses?.map((email) => ({
                id: email.id,
                emailAddress: email.emailAddress,
              })) || [],
            primaryEmailAddressId: clerkUser.primaryEmailAddressId,
            phoneNumbers:
              clerkUser.phoneNumbers?.map((phone) => ({
                id: phone.id,
                phoneNumber: phone.phoneNumber,
              })) || [],
            primaryPhoneNumberId: clerkUser.primaryPhoneNumberId,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            username: clerkUser.username,
          });

          currentAuthorId = author.authorId;
          console.log('Successfully created/updated author:', author.authorId);
        } catch (error) {
          console.error('Failed to create/update author for shared link access:', error);
          return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
        }
      } else {
        currentAuthorId = existingAuthor[0].authorId;
      }
    }

    // Add user as collaborator if they have access and an author ID
    if (currentAuthorId) {
      if (link.accessLevel === 'edit') {
        // Check if user is already a collaborator
        const existingCollaborator = await db
          .select()
          .from(storyCollaborators)
          .where(
            and(
              eq(storyCollaborators.storyId, link.storyId),
              eq(storyCollaborators.userId, currentAuthorId),
            ),
          )
          .limit(1);

        if (!existingCollaborator.length) {
          // Add as editor collaborator
          await db.insert(storyCollaborators).values({
            storyId: link.storyId,
            userId: currentAuthorId,
            role: 'editor',
          });
          console.log('Added user as editor collaborator:', currentAuthorId);
        }
      } else if (link.accessLevel === 'view') {
        // For view links, add as viewer if not already a collaborator
        const existingCollaborator = await db
          .select()
          .from(storyCollaborators)
          .where(
            and(
              eq(storyCollaborators.storyId, link.storyId),
              eq(storyCollaborators.userId, currentAuthorId),
            ),
          )
          .limit(1);

        if (!existingCollaborator.length) {
          // Add as viewer collaborator
          await db.insert(storyCollaborators).values({
            storyId: link.storyId,
            userId: currentAuthorId,
            role: 'viewer',
          });
          console.log('Added user as viewer collaborator:', currentAuthorId);
        }
      }
    }

    // Use the canonical read route so downstream code doesn't mis-route.
    const response = NextResponse.json({
      success: true,
      story: link.story,
      author: link.author,
      accessLevel: link.accessLevel,
      redirectUrl: `/stories/read/${link.storyId}${link.accessLevel === 'edit' ? '?mode=edit' : ''}`,
    });
    if (
      currentAuthorId &&
      new URL(request.url).searchParams.get('utm_campaign') === 'story_share' &&
      readAnalyticsConsentCookie(
        cookiesFromHeaders(request.headers).get(CONSENT_COOKIE_NAME)?.value,
      )
    ) {
      response.cookies.set('mythoria_reader_link', token, {
        maxAge: 120,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/api/analytics/qualified-share',
      });
    }
    return response;
  } catch (error) {
    console.error('Error accessing shared story:', error);
    return NextResponse.json({ error: 'Failed to access shared story' }, { status: 500 });
  }
}
