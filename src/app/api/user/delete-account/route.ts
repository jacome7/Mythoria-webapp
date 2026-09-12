import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { randomUUID } from 'node:crypto';
import {
  referralAssignments,
  referralCommissions,
  referralCustomers,
  referralOutbox,
  referralVisits,
} from '@/db/schema/referrals';
import { db } from '@/db';
import {
  authors,
  stories,
  credits,
  addresses,
  events,
  shareLinks,
  storyCollaborators,
  storyVersions,
  paymentMethods,
  paymentOrders,
  paymentEvents,
  characters,
  writingPersonas,
  aiEdits,
  chapters,
  analyticsAttributions,
  analyticsOutbox,
  storyRatings,
  promotionCodes,
  keyInvoiceCustomers,
} from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`Account deletion requested for user: ${userId}`);

    // Get the author record first to verify ownership
    const [author] = await db
      .select({ authorId: authors.authorId })
      .from(authors)
      .where(eq(authors.clerkUserId, userId))
      .limit(1);
    if (!author) {
      const clerk = await clerkClient();
      await clerk.users.deleteUser(userId);
      return NextResponse.json({ message: 'Account successfully deleted' });
    }

    console.log(`Starting account deletion process for author: ${author.authorId}`);

    // Start a transaction to ensure all data is deleted atomically
    await db.transaction(async (tx) => {
      // Get all story IDs for this author
      const userStories = await tx
        .select({ storyId: stories.storyId })
        .from(stories)
        .where(eq(stories.authorId, author.authorId));

      const storyIds = userStories.map((s) => s.storyId);

      // Delete related data if there are stories
      if (storyIds.length > 0) {
        // MOVED TO WORKFLOWS_DB - Story generation runs and steps are now in workflows database
        // These tables will need to be cleaned up via the story-generation-workflow service
        // const storyRuns = await tx.select({ runId: storyGenerationRuns.runId })
        //   .from(storyGenerationRuns)
        //   .where(inArray(storyGenerationRuns.storyId, storyIds));
        //
        // const runIds = storyRuns.map(r => r.runId);
        //
        // // Delete story generation steps for all runs
        // if (runIds.length > 0) {
        //   await tx.delete(storyGenerationSteps)
        //     .where(inArray(storyGenerationSteps.runId, runIds));
        // }
        //
        // // Delete story generation runs
        // await tx.delete(storyGenerationRuns)
        //   .where(inArray(storyGenerationRuns.storyId, storyIds));

        // Delete share links
        await tx.delete(shareLinks).where(inArray(shareLinks.storyId, storyIds));

        // Delete story versions
        await tx.delete(storyVersions).where(inArray(storyVersions.storyId, storyIds));
      }

      // Delete story collaborators
      await tx.delete(storyCollaborators).where(eq(storyCollaborators.userId, author.authorId));

      // Delete events
      await tx.delete(events).where(eq(events.authorId, author.authorId));

      // Delete addresses
      await tx.delete(addresses).where(eq(addresses.authorId, author.authorId));

      // Delete stories (this will cascade to many related tables)
      await tx.delete(stories).where(eq(stories.authorId, author.authorId));
      await tx.delete(chapters).where(eq(chapters.authorId, author.authorId));
      await tx.delete(characters).where(eq(characters.authorId, author.authorId));
      await tx.delete(writingPersonas).where(eq(writingPersonas.authorId, author.authorId));
      await tx.delete(aiEdits).where(eq(aiEdits.authorId, author.authorId));
      await tx.delete(analyticsOutbox).where(eq(analyticsOutbox.authorId, author.authorId));
      await tx
        .delete(analyticsAttributions)
        .where(eq(analyticsAttributions.authorId, author.authorId));
      await tx
        .update(storyRatings)
        .set({ userId: null })
        .where(eq(storyRatings.userId, author.authorId));
      await tx
        .update(promotionCodes)
        .set({ referrerAuthorId: null })
        .where(eq(promotionCodes.referrerAuthorId, author.authorId));

      // Delete credits
      await tx.delete(credits).where(eq(credits.authorId, author.authorId));

      // Preserve an anonymized financial subject so existing non-null financial
      // foreign keys remain compatible across services during additive rollout.
      // The Clerk identity is removed; this tombstone cannot authenticate.
      await tx
        .update(referralAssignments)
        .set({
          authorId: null,
          endedAt: new Date(),
          endedReason: 'account_closed',
          changedByActorId: 'deleted-account',
        })
        .where(eq(referralAssignments.authorId, author.authorId));
      await tx
        .update(referralCommissions)
        .set({ customerAuthorId: null })
        .where(eq(referralCommissions.customerAuthorId, author.authorId));
      await tx
        .update(referralCustomers)
        .set({ authorId: null })
        .where(eq(referralCustomers.authorId, author.authorId));
      await tx
        .update(referralVisits)
        .set({ linkedAuthorId: null })
        .where(eq(referralVisits.linkedAuthorId, author.authorId));
      await tx
        .update(paymentMethods)
        .set({
          billingDetails: null,
          providerRef: 'deleted',
          brand: null,
          last4: null,
          expMonth: null,
          expYear: null,
        })
        .where(eq(paymentMethods.authorId, author.authorId));
      await tx
        .update(keyInvoiceCustomers)
        .set({ email: null, phone: null })
        .where(eq(keyInvoiceCustomers.authorId, author.authorId));
      // Fiscal identity stays in the fiscal archive; operational order metadata
      // retains only the provider references needed for reconciliation.
      const orders = await tx
        .select()
        .from(paymentOrders)
        .where(eq(paymentOrders.authorId, author.authorId));
      for (const order of orders) {
        await tx
          .update(paymentEvents)
          .set({ data: { provider: order.provider, anonymized: true } })
          .where(eq(paymentEvents.orderId, order.orderId));
        const metadata = order.metadata as {
          stripe?: Record<string, unknown>;
          orderTotals?: unknown;
        } | null;
        const stripe = metadata?.stripe;
        await tx
          .update(paymentOrders)
          .set({
            metadata: {
              orderTotals: metadata?.orderTotals,
              stripe: {
                checkoutSessionId: stripe?.checkoutSessionId,
                paymentIntentId: stripe?.paymentIntentId,
                amountTotal: stripe?.amountTotal,
                paymentStatus: stripe?.paymentStatus,
              },
            },
          })
          .where(eq(paymentOrders.orderId, order.orderId));
      }
      const tombstone = randomUUID();
      await tx
        .update(authors)
        .set({
          clerkUserId: `deleted:${tombstone}`,
          displayName: 'Deleted account',
          email: `${tombstone}@anonymized.invalid`,
          accountClosedAt: new Date(),
          fiscalNumber: null,
          mobilePhone: null,
          gender: null,
          literaryAge: null,
          primaryGoals: [],
          primaryGoalOther: null,
          audiences: [],
          interests: [],
          countryOfOrigin: null,
          lastLoginAt: null,
          acquisitionCampaignRecipientId: null,
          emailStatus: 'unsub',
          notificationPreference: 'essential',
        })
        .where(eq(authors.authorId, author.authorId));
      await tx
        .insert(referralOutbox)
        .values({
          kind: 'account-deletion',
          dedupeKey: `account-deletion:${author.authorId}`,
          payload: { clerkUserId: userId },
        })
        .onConflictDoNothing();
    }); // Delete user from Clerk
    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);

    console.log(`Account deletion completed successfully for user: ${userId}`);

    return NextResponse.json({ message: 'Account successfully deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting account:', error);

    // Check if it's a Clerk error
    if (error && typeof error === 'object' && 'status' in error) {
      return NextResponse.json(
        { error: 'Failed to delete account from authentication system' },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
