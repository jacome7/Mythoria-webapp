import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { analyticsAttributions, shareLinks, stories } from '@/db/schema';
import { STORY_INTENTS } from '@/constants/intents';
import { sanitizeClientAnalyticsContext } from '@/lib/analytics/ecommerce';
import { sanitizeAnalyticsPathname } from '@/lib/analytics/page-context';
import { analyticsReference } from '@/lib/analytics/reference';
import { storyShareFromCampaign, type StoryShareContext } from '@/lib/analytics/story-share';
import type { CampaignParams } from '@/lib/campaign-context';

export const runtime = 'nodejs';

const NORMAL_ATTRIBUTION_MAX_AGE_SECONDS = 24 * 60 * 60;
const STORY_SHARE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const optionalValue = z.string().trim().max(255).optional();
const landingSlugValue = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[^\\/?#\u0000-\u001f\u007f]+$/)
  .optional();
const attributionSchema = z.object({
  analyticsContext: z.unknown(),
  landingPath: z.string().trim().max(160).optional(),
  latestPath: z.string().trim().max(160).optional(),
  landingSlug: z.string().trim().max(160).optional(),
  primaryIntent: z.enum(STORY_INTENTS).optional(),
  campaign: z
    .object({
      utm_source: optionalValue,
      utm_medium: optionalValue,
      utm_campaign: optionalValue,
      utm_id: optionalValue,
      utm_term: optionalValue,
      utm_content: optionalValue,
      gclid: optionalValue,
      gbraid: optionalValue,
      wbraid: optionalValue,
    })
    .optional(),
});

function rawPathname(path: string | undefined): string | undefined {
  if (!path) return undefined;
  try {
    return new URL(path, 'https://mythoria.pt').pathname;
  } catch {
    return undefined;
  }
}

async function validateStoryShare(
  campaign: CampaignParams,
  landingPath: string | undefined,
): Promise<StoryShareContext | undefined> {
  const candidate = storyShareFromCampaign(campaign);
  const pathname = rawPathname(landingPath);
  if (!candidate || !pathname) return undefined;

  const publicMatch = pathname.match(/^\/[a-z]{2}-[A-Z]{2}\/p\/([^/?#]+)\/?$/);
  if (candidate.scope === 'public' && publicMatch) {
    const [story] = await db
      .select({ storyId: stories.storyId })
      .from(stories)
      .where(and(eq(stories.slug, publicMatch[1]), eq(stories.isPublic, true)))
      .limit(1);
    return story && analyticsReference(story.storyId) === candidate.itemId ? candidate : undefined;
  }

  const privateMatch = pathname.match(/^\/[a-z]{2}-[A-Z]{2}\/s\/([0-9a-f-]{36})(\/edit)?\/?$/i);
  const isEditPath = Boolean(privateMatch?.[2]);
  if (
    !privateMatch ||
    (candidate.scope === 'private_edit') !== isEditPath ||
    candidate.scope === 'public'
  ) {
    return undefined;
  }

  const token = z.string().uuid().safeParse(privateMatch[1]);
  if (!token.success) return undefined;
  const [shareLink] = await db
    .select({ storyId: shareLinks.storyId })
    .from(shareLinks)
    .where(
      and(
        eq(shareLinks.id, token.data),
        eq(shareLinks.revoked, false),
        gt(shareLinks.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return shareLink && analyticsReference(shareLink.storyId) === candidate.itemId
    ? candidate
    : undefined;
}

function storyShareFields(context: StoryShareContext | undefined, now: Date) {
  if (!context) return {};
  return {
    storyShareItemId: context.itemId,
    storyShareMethod: context.method,
    storyShareScope: context.scope,
    storyShareTouchedAt: now,
    storyShareExpiresAt: new Date(now.getTime() + STORY_SHARE_MAX_AGE_SECONDS * 1_000),
  };
}

function storyShareFromRow(
  row: typeof analyticsAttributions.$inferSelect | undefined,
  now: Date,
): StoryShareContext | undefined {
  if (
    !row ||
    !row.storyShareExpiresAt ||
    row.storyShareExpiresAt <= now ||
    !row.storyShareItemId ||
    !row.storyShareMethod ||
    !row.storyShareScope
  ) {
    return undefined;
  }
  return storyShareFromCampaign({
    utm_source: row.storyShareMethod,
    utm_medium:
      row.storyShareMethod === 'whatsapp' || row.storyShareMethod === 'facebook'
        ? 'social'
        : row.storyShareMethod === 'email'
          ? 'email'
          : 'referral',
    utm_campaign: 'story_share',
    utm_id: row.storyShareItemId,
    utm_content: row.storyShareScope,
  });
}

function storyShareFieldsFromRow(
  row: typeof analyticsAttributions.$inferSelect | undefined,
  now: Date,
) {
  const context = storyShareFromRow(row, now);
  if (!context || !row?.storyShareTouchedAt || !row.storyShareExpiresAt) return {};
  return {
    storyShareItemId: context.itemId,
    storyShareMethod: context.method,
    storyShareScope: context.scope,
    storyShareTouchedAt: row.storyShareTouchedAt,
    storyShareExpiresAt: row.storyShareExpiresAt,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = attributionSchema.parse(await request.json());
    const analytics = sanitizeClientAnalyticsContext(body.analyticsContext);
    if (!analytics) return NextResponse.json({ captured: false }, { status: 202 });

    const campaign = (body.campaign || {}) as CampaignParams;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + NORMAL_ATTRIBUTION_MAX_AGE_SECONDS * 1_000);
    const pageFromContext = analytics.pageLocation
      ? sanitizeAnalyticsPathname(new URL(analytics.pageLocation).pathname)
      : undefined;
    const legacyLandingPath = body.landingSlug?.startsWith('/') ? body.landingSlug : undefined;
    const parsedLandingSlug = landingSlugValue.safeParse(
      body.landingSlug?.startsWith('/') ? undefined : body.landingSlug,
    );
    const landingSlug = parsedLandingSlug.success ? parsedLandingSlug.data : undefined;
    const rawLandingPath = body.landingPath || legacyLandingPath;
    const landingPath = sanitizeAnalyticsPathname(rawLandingPath || '') || pageFromContext;
    const latestPath =
      sanitizeAnalyticsPathname(body.latestPath || '') || pageFromContext || landingPath;
    const referrerPath = analytics.pageReferrer
      ? sanitizeAnalyticsPathname(new URL(analytics.pageReferrer).pathname)
      : undefined;
    const clickIdentifier = campaign.gclid || campaign.gbraid || campaign.wbraid;
    const clickIdentifierKind = campaign.gclid
      ? 'gclid'
      : campaign.gbraid
        ? 'gbraid'
        : campaign.wbraid
          ? 'wbraid'
          : undefined;
    const incomingStoryShare = await validateStoryShare(campaign, rawLandingPath);
    const existingAttributionId = request.cookies.get('mythoria_attribution')?.value;
    const validExistingId = z.string().uuid().safeParse(existingAttributionId);
    const [existingRow] = validExistingId.success
      ? await db
          .select()
          .from(analyticsAttributions)
          .where(
            and(
              eq(analyticsAttributions.attributionId, validExistingId.data),
              eq(analyticsAttributions.clientId, analytics.clientId),
              gt(analyticsAttributions.expiresAt, now),
            ),
          )
      : [];
    const [shareCarryoverRow] = validExistingId.success
      ? await db
          .select()
          .from(analyticsAttributions)
          .where(
            and(
              eq(analyticsAttributions.attributionId, validExistingId.data),
              eq(analyticsAttributions.clientId, analytics.clientId),
              gt(analyticsAttributions.storyShareExpiresAt, now),
            ),
          )
      : [];
    const effectiveStoryShare =
      incomingStoryShare || storyShareFromRow(existingRow || shareCarryoverRow, now);
    const shareFields = storyShareFields(incomingStoryShare, now);
    const insertValues = {
      clientId: analytics.clientId,
      sessionId: analytics.sessionId,
      engagementTimeMsec: analytics.engagementTimeMsec,
      consent: analytics.consent,
      landingSlug,
      primaryIntent: body.primaryIntent,
      utmSource: campaign.utm_source,
      utmMedium: campaign.utm_medium,
      utmCampaign: campaign.utm_campaign,
      utmId: campaign.utm_id,
      utmTerm: campaign.utm_term,
      utmContent: campaign.utm_content,
      gclid: campaign.gclid,
      gbraid: campaign.gbraid,
      wbraid: campaign.wbraid,
      firstLandingPath: landingPath,
      firstPrimaryIntent: body.primaryIntent,
      firstUtmSource: campaign.utm_source,
      firstUtmMedium: campaign.utm_medium,
      firstUtmCampaign: campaign.utm_campaign,
      firstUtmId: campaign.utm_id,
      firstUtmTerm: campaign.utm_term,
      firstUtmContent: campaign.utm_content,
      firstClickIdentifier: clickIdentifier,
      firstClickIdentifierKind: clickIdentifierKind,
      latestPath,
      latestReferrerPath: referrerPath,
      latestAttributionAt: now,
      expiresAt,
      ...(incomingStoryShare
        ? shareFields
        : storyShareFieldsFromRow(existingRow || shareCarryoverRow, now)),
    };
    const [existing] = existingRow
      ? await db
          .update(analyticsAttributions)
          .set({
            sessionId: analytics.sessionId,
            engagementTimeMsec: analytics.engagementTimeMsec,
            consent: analytics.consent,
            landingSlug,
            primaryIntent: body.primaryIntent,
            utmSource: campaign.utm_source,
            utmMedium: campaign.utm_medium,
            utmCampaign: campaign.utm_campaign,
            utmId: campaign.utm_id,
            utmTerm: campaign.utm_term,
            utmContent: campaign.utm_content,
            gclid: campaign.gclid,
            gbraid: campaign.gbraid,
            wbraid: campaign.wbraid,
            latestPath,
            latestReferrerPath: referrerPath,
            latestAttributionAt: now,
            expiresAt,
            ...(incomingStoryShare ? shareFields : {}),
            firstLandingPath:
              existingRow.firstLandingPath || existingRow.landingSlug || landingPath,
            firstPrimaryIntent:
              existingRow.firstPrimaryIntent || existingRow.primaryIntent || body.primaryIntent,
            firstUtmSource:
              existingRow.firstUtmSource || existingRow.utmSource || campaign.utm_source,
            firstUtmMedium:
              existingRow.firstUtmMedium || existingRow.utmMedium || campaign.utm_medium,
            firstUtmCampaign:
              existingRow.firstUtmCampaign || existingRow.utmCampaign || campaign.utm_campaign,
            firstUtmId: existingRow.firstUtmId || existingRow.utmId || campaign.utm_id,
            firstUtmTerm: existingRow.firstUtmTerm || existingRow.utmTerm || campaign.utm_term,
            firstUtmContent:
              existingRow.firstUtmContent || existingRow.utmContent || campaign.utm_content,
            firstClickIdentifier:
              existingRow.firstClickIdentifier ||
              existingRow.gclid ||
              existingRow.gbraid ||
              existingRow.wbraid ||
              clickIdentifier,
            firstClickIdentifierKind:
              existingRow.firstClickIdentifierKind ||
              (existingRow.gclid
                ? 'gclid'
                : existingRow.gbraid
                  ? 'gbraid'
                  : existingRow.wbraid
                    ? 'wbraid'
                    : clickIdentifierKind),
          })
          .where(eq(analyticsAttributions.attributionId, existingRow.attributionId))
          .returning({ attributionId: analyticsAttributions.attributionId })
      : [];
    const [inserted] = existing
      ? []
      : await db
          .insert(analyticsAttributions)
          .values(insertValues)
          .returning({ attributionId: analyticsAttributions.attributionId });
    const attribution = existing || inserted;

    const response = NextResponse.json({
      captured: true,
      ...(effectiveStoryShare ? { storyShare: effectiveStoryShare } : {}),
    });
    response.cookies.set('mythoria_attribution', attribution.attributionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: effectiveStoryShare
        ? STORY_SHARE_MAX_AGE_SECONDS
        : NORMAL_ATTRIBUTION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid attribution data' }, { status: 400 });
    }
    console.error('Failed to capture analytics attribution:', error);
    return NextResponse.json({ error: 'Attribution capture failed' }, { status: 500 });
  }
}
