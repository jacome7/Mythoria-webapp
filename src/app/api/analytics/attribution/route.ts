import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { analyticsAttributions, shareLinks, stories } from '@/db/schema';
import { STORY_INTENTS } from '@/constants/intents';
import {
  type ClientAnalyticsContext,
  sanitizeClientAnalyticsContext,
} from '@/lib/analytics/ecommerce';
import { sanitizeAnalyticsPathname } from '@/lib/analytics/page-context';
import { readAnalyticsConsentCookie } from '@/lib/analytics/consent-server';
import { analyticsPrivacyPaused, isGaClientId } from '@/lib/analytics/destinations';
import { getLandingPageBySlug } from '@/content/landing-pages';
import { analyticsReference } from '@/lib/analytics/reference';
import { storyShareFromCampaign, type StoryShareContext } from '@/lib/analytics/story-share';
import type { CampaignParams } from '@/lib/campaign-context';
import { CONSENT_COOKIE_NAME } from '@/lib/consent';
import {
  OBREF_COOKIE_NAME,
  OPPREF_COOKIE_NAME,
  readAdvertisingConsent,
} from '@/lib/openai-ads/context';
import { AD_CONTEXT_LIMITS } from '@/lib/openai-ads/types';

export const runtime = 'nodejs';

const STORY_SHARE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const optionalValue = z.string().trim().max(255).optional();
const opprefValue = z.string().trim().max(AD_CONTEXT_LIMITS.oppref).optional();
const landingSlugValue = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[^\\/?#\u0000-\u001f\u007f]+$/)
  .optional();
const attributionSchema = z.object({
  analyticsContext: z.unknown().optional(),
  landingPath: z.string().trim().max(160).optional(),
  latestPath: z.string().trim().max(160).optional(),
  landingSlug: z.string().trim().max(160).optional(),
  primaryIntent: z.enum(STORY_INTENTS).optional(),
  // OpenAI Ads click reference. Persisted only with advertising consent; never a GA4 parameter.
  oppref: opprefValue,
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
      oppref: opprefValue,
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

function cookieReference(value: string | undefined, maxLength: number): string | undefined {
  if (!value) return undefined;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Keep the raw cookie value.
  }
  const trimmed = decoded.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : undefined;
}

/**
 * OpenAI Ads references to persist: identifiers only with advertising consent, explicit nulls to
 * clear previously stored ones once advertising is no longer granted.
 */
function openAiReferenceFields(
  request: NextRequest,
  advertisingGranted: boolean,
  oppref: string | undefined,
  now: Date,
) {
  if (!advertisingGranted) return { oppref: null, opprefCapturedAt: null, obref: null };
  const clickReference =
    oppref ||
    cookieReference(request.cookies.get(OPPREF_COOKIE_NAME)?.value, AD_CONTEXT_LIMITS.oppref);
  const browserReference = cookieReference(
    request.cookies.get(OBREF_COOKIE_NAME)?.value,
    AD_CONTEXT_LIMITS.obref,
  );
  return {
    ...(clickReference ? { oppref: clickReference, opprefCapturedAt: now } : {}),
    ...(browserReference ? { obref: browserReference } : {}),
  };
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

function cleanAdReference(value?: string): string | undefined {
  return value && /^[A-Za-z0-9_.~-]+$/.test(value) ? value : undefined;
}

function sanitizeCampaignAttribution(campaign: CampaignParams): CampaignParams {
  const share = storyShareFromCampaign(campaign);
  if (share)
    return {
      utm_source: share.method,
      utm_medium: campaign.utm_medium,
      utm_campaign: 'story_share',
      utm_id: share.itemId,
      utm_content: share.scope,
    };
  const source = campaign.utm_source;
  const medium = campaign.utm_medium;
  return {
    ...(['google', 'bing', 'chatgpt', 'newsletter', 'facebook', 'instagram'].includes(source || '')
      ? { utm_source: source }
      : {}),
    ...(['cpc', 'organic', 'paid', 'email', 'social', 'referral'].includes(medium || '')
      ? { utm_medium: medium }
      : {}),
  };
}

export async function POST(request: NextRequest) {
  try {
    if (analyticsPrivacyPaused()) return NextResponse.json({ captured: false }, { status: 202 });
    const cookie = request.cookies.get(CONSENT_COOKIE_NAME)?.value;
    const consent = readAnalyticsConsentCookie(cookie);
    if (!consent) return NextResponse.json({ captured: false }, { status: 202 });

    const body = attributionSchema.parse(await request.json());
    const incoming = sanitizeClientAnalyticsContext(body.analyticsContext);
    const now = new Date();
    const validExistingId = z
      .string()
      .uuid()
      .safeParse(request.cookies.get('mythoria_attribution')?.value);
    const [existingRow] = validExistingId.success
      ? await db
          .select()
          .from(analyticsAttributions)
          .where(
            and(
              eq(analyticsAttributions.attributionId, validExistingId.data),
              isNull(analyticsAttributions.revokedAt),
            ),
          )
          .limit(1)
      : [];
    const analytics: ClientAnalyticsContext = {
      ...(incoming && isGaClientId(incoming.clientId) ? incoming : {}),
      clientId:
        incoming && isGaClientId(incoming.clientId)
          ? incoming.clientId
          : existingRow?.clientId || `fp.${randomUUID()}`,
      consent,
    };

    const {
      oppref: campaignOppref,
      gclid,
      gbraid,
      wbraid,
      ...campaignParams
    } = body.campaign || {};
    const advertisingGranted = readAdvertisingConsent(cookie) === 'granted';
    const campaign: CampaignParams = {
      ...sanitizeCampaignAttribution(campaignParams),
      ...(advertisingGranted
        ? {
            gclid: cleanAdReference(gclid),
            gbraid: cleanAdReference(gbraid),
            wbraid: cleanAdReference(wbraid),
          }
        : {}),
    };
    const openAiFields = openAiReferenceFields(
      request,
      advertisingGranted,
      cleanAdReference(body.oppref || campaignOppref),
      now,
    );
    const expiresAt = new Date(now.getTime() + STORY_SHARE_MAX_AGE_SECONDS * 1_000);
    const pageFromContext = analytics.pageLocation
      ? sanitizeAnalyticsPathname(new URL(analytics.pageLocation).pathname)
      : undefined;
    const legacyLandingPath = body.landingSlug?.startsWith('/') ? body.landingSlug : undefined;
    const parsedLandingSlug = landingSlugValue.safeParse(
      body.landingSlug?.startsWith('/') ? undefined : body.landingSlug,
    );
    const landingSlug =
      parsedLandingSlug.success &&
      parsedLandingSlug.data &&
      getLandingPageBySlug(parsedLandingSlug.data)
        ? parsedLandingSlug.data
        : undefined;
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
      ...(advertisingGranted ? openAiFields : {}),
      ...shareFields,
    };
    // Compare the row at UPDATE time, not the earlier SELECT snapshot: parallel
    // captures must not retain an old boundary after a real acquisition change.
    const temporalContext = {
      sessionId: analytics.sessionId,
      consent: analytics.consent,
      landingSlug,
      primaryIntent: body.primaryIntent,
      utmSource: campaign.utm_source,
      utmMedium: campaign.utm_medium,
      utmCampaign: campaign.utm_campaign,
      utmId: campaign.utm_id,
      utmTerm: campaign.utm_term,
      utmContent: campaign.utm_content,
      gclid: advertisingGranted ? campaign.gclid : null,
      gbraid: advertisingGranted ? campaign.gbraid : null,
      wbraid: advertisingGranted ? campaign.wbraid : null,
      ...(incomingStoryShare
        ? {
            storyShareItemId: shareFields.storyShareItemId,
            storyShareMethod: shareFields.storyShareMethod,
            storyShareScope: shareFields.storyShareScope,
          }
        : {}),
    };
    const unchangedContext = and(
      ...(Object.keys(temporalContext) as Array<keyof typeof temporalContext>).flatMap((key) => {
        const value = temporalContext[key];
        // Drizzle omits undefined SET values, retaining the existing column.
        if (value === undefined) return [];
        return [
          sql`${analyticsAttributions[key]} is not distinct from ${key === 'consent' ? JSON.stringify(value) : value}`,
        ];
      }),
    );
    const [existing] = existingRow
      ? await db
          .update(analyticsAttributions)
          .set({
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
            gclid: advertisingGranted ? campaign.gclid : null,
            gbraid: advertisingGranted ? campaign.gbraid : null,
            wbraid: advertisingGranted ? campaign.wbraid : null,
            latestPath,
            latestReferrerPath: referrerPath,
            latestAttributionAt: sql`case when ${unchangedContext}
              then coalesce(${analyticsAttributions.latestAttributionAt}, ${analyticsAttributions.createdAt})
              else ${now.toISOString()}::timestamptz end`,
            expiresAt,
            ...openAiFields,
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
            firstClickIdentifier: !advertisingGranted
              ? null
              : existingRow.firstClickIdentifier ||
                existingRow.gclid ||
                existingRow.gbraid ||
                existingRow.wbraid ||
                clickIdentifier,
            firstClickIdentifierKind: !advertisingGranted
              ? null
              : existingRow.firstClickIdentifierKind ||
                (existingRow.gclid
                  ? 'gclid'
                  : existingRow.gbraid
                    ? 'gbraid'
                    : existingRow.wbraid
                      ? 'wbraid'
                      : clickIdentifierKind),
          })
          .where(
            and(
              eq(analyticsAttributions.attributionId, existingRow.attributionId),
              isNull(analyticsAttributions.revokedAt),
            ),
          )
          .returning({ attributionId: analyticsAttributions.attributionId })
      : [];
    // In-flight capture must never replace a receipt revoked while it was being refreshed.
    if (existingRow && !existing) return NextResponse.json({ captured: false }, { status: 202 });
    const [inserted] = existing
      ? []
      : await db
          .insert(analyticsAttributions)
          .values(insertValues)
          .returning({ attributionId: analyticsAttributions.attributionId });
    const attribution = existing || inserted;
    if (!attribution) return NextResponse.json({ captured: false }, { status: 202 });

    const response = NextResponse.json({
      captured: true,
      ...(incomingStoryShare ? { storyShare: incomingStoryShare } : {}),
    });
    response.cookies.set('mythoria_attribution', attribution.attributionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: STORY_SHARE_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid attribution data' }, { status: 400 });
    }
    console.error('Failed to capture analytics attribution');
    return NextResponse.json({ error: 'Attribution capture failed' }, { status: 500 });
  }
}
