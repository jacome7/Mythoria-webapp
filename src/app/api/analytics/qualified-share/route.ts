import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  analyticsOutbox,
  qualifiedShareOpens,
  shareLinks,
  stories,
  storyCollaborators,
} from '@/db/schema';
import { getCurrentAuthor } from '@/lib/auth';
import { analyticsReference } from '@/lib/analytics/reference';
import { storyShareFromCampaign } from '@/lib/analytics/story-share';
import { getPublishedPremiumRevision } from '@/lib/premium-children-book/audiobook';
import { hasPremiumBookMarker } from '@/lib/premium-children-book/contract';
import {
  activeReceipt,
  growthOutboxContext,
  requestAnalyticsReceipt,
} from '@/lib/growth/measurement-server';

const input = z.object({
  slug: z.string().min(1).max(180).optional(),
  storyId: z.string().uuid().optional(),
  campaign: z.object({
    utm_source: z.string().max(16),
    utm_medium: z.string().max(16),
    utm_campaign: z.literal('story_share'),
    utm_id: z.string().regex(/^[a-f0-9]{12}$/),
    utm_content: z.string().max(16),
  }),
});

const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  const receiptId = requestAnalyticsReceipt(request);
  if (!receiptId) return noContent();
  const agent = request.headers.get('user-agent');
  if (!agent || /bot|crawl|spider|preview|headless|facebookexternalhit/i.test(agent))
    return noContent();
  if (request.headers.get('sec-fetch-site') === 'cross-site') return noContent();
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return noContent();
  const { slug, storyId, campaign } = parsed.data;
  const share = storyShareFromCampaign(campaign);
  if (!share) return noContent();
  const author = await getCurrentAuthor();
  const authorId = author?.authorId;
  const now = new Date();

  let story: { id: string; owner: string } | undefined;
  if (slug && share.scope === 'public') {
    [story] = await db
      .select({ id: stories.storyId, owner: stories.authorId })
      .from(stories)
      .where(and(eq(stories.slug, slug), eq(stories.isPublic, true)));
  } else if (storyId && authorId && share.scope !== 'public') {
    const token = request.cookies.get('mythoria_reader_link')?.value;
    if (!token || !z.string().uuid().safeParse(token).success) return noContent();
    const [linkedStory] = await db
      .select({
        id: stories.storyId,
        owner: stories.authorId,
        status: stories.status,
        features: stories.features,
        collaboratorId: storyCollaborators.userId,
      })
      .from(shareLinks)
      .innerJoin(stories, eq(stories.storyId, shareLinks.storyId))
      .leftJoin(
        storyCollaborators,
        and(
          eq(storyCollaborators.storyId, stories.storyId),
          eq(storyCollaborators.userId, authorId),
        ),
      )
      .where(
        and(
          eq(shareLinks.id, token),
          eq(shareLinks.storyId, storyId),
          eq(shareLinks.revoked, false),
          gt(shareLinks.expiresAt, now),
          eq(shareLinks.accessLevel, share.scope === 'private_edit' ? 'edit' : 'view'),
        ),
      );
    if (!linkedStory) return noContent();
    if (hasPremiumBookMarker(linkedStory.features)) {
      // Premium view links authorize the current reader without persisting a collaborator grant.
      if (
        share.scope !== 'private_view' ||
        linkedStory.status !== 'published' ||
        !getPublishedPremiumRevision(linkedStory.features)
      ) {
        return noContent();
      }
    } else if (!linkedStory.collaboratorId) {
      return noContent();
    }
    story = linkedStory;
  }
  if (!story || story.owner === authorId || analyticsReference(story.id) !== share.itemId)
    return noContent();
  const validStory = story;
  await db.transaction(async (tx) => {
    if (authorId)
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`share-recipient:${authorId}`}))`,
      );
    const receipt = await activeReceipt(tx, receiptId);
    if (!receipt || (receipt.authorId && receipt.authorId !== authorId)) return;
    const [opened] = await tx
      .insert(qualifiedShareOpens)
      .values({
        receiptId,
        storyId: validStory.id,
        authorId,
        method: share.method,
        scope: share.scope,
      })
      .onConflictDoNothing()
      .returning();
    if (!opened) return;
    await tx
      .insert(analyticsOutbox)
      .values({
        ...growthOutboxContext(receipt),
        authorId,
        occurredAt: opened.openedAt,
        eventName: 'story_share_qualified_open',
        dedupeKey: `growth:qualified_open:${opened.openId}`,
        params: {
          schema_version: 2,
          reader_class: authorId ? 'account' : 'browser',
          story_share_scope: share.scope,
          story_share_method: share.method,
          story_share_item_id: share.itemId,
        },
      })
      .onConflictDoNothing();
  });
  return noContent();
}
