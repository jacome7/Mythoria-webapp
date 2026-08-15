import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { and, eq, gt } from 'drizzle-orm';
import { analyticsAttributions } from '@/db/schema';
import { sanitizeClientAnalyticsContext } from '@/lib/analytics/ecommerce';
import { STORY_INTENTS } from '@/constants/intents';
import { sanitizeAnalyticsPathname } from '@/lib/analytics/page-context';

export const runtime = 'nodejs';

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

export async function POST(request: NextRequest) {
  try {
    const body = attributionSchema.parse(await request.json());
    const analytics = sanitizeClientAnalyticsContext(body.analyticsContext);
    if (!analytics) {
      return NextResponse.json({ captured: false }, { status: 202 });
    }

    const campaign = body.campaign || {};
    const now = new Date();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pageFromContext = analytics.pageLocation
      ? sanitizeAnalyticsPathname(new URL(analytics.pageLocation).pathname)
      : undefined;
    const legacyLandingPath = body.landingSlug?.startsWith('/') ? body.landingSlug : undefined;
    const parsedLandingSlug = landingSlugValue.safeParse(
      body.landingSlug?.startsWith('/') ? undefined : body.landingSlug,
    );
    const landingSlug = parsedLandingSlug.success ? parsedLandingSlug.data : undefined;
    const landingPath =
      sanitizeAnalyticsPathname(body.landingPath || legacyLandingPath || '') || pageFromContext;
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
    };
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
    const [existing] = existingRow
      ? await db
          .update(analyticsAttributions)
          .set({
            sessionId: analytics.sessionId,
            engagementTimeMsec: analytics.engagementTimeMsec,
            consent: analytics.consent,
            latestPath,
            latestReferrerPath: referrerPath,
            latestAttributionAt: now,
            expiresAt,
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

    const response = NextResponse.json({ captured: true });
    response.cookies.set('mythoria_attribution', attribution.attributionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
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
