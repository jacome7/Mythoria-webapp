import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { and, eq, gt } from 'drizzle-orm';
import { analyticsAttributions } from '@/db/schema';
import { sanitizeClientAnalyticsContext } from '@/lib/analytics/ecommerce';
import { STORY_INTENTS } from '@/constants/intents';

export const runtime = 'nodejs';

const optionalValue = z.string().trim().max(255).optional();
const attributionSchema = z.object({
  analyticsContext: z.unknown(),
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
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const values = {
      clientId: analytics.clientId,
      sessionId: analytics.sessionId,
      consent: analytics.consent,
      landingSlug: body.landingSlug,
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
      expiresAt,
    };
    const existingAttributionId = request.cookies.get('mythoria_attribution')?.value;
    const [existing] = existingAttributionId
      ? await db
          .update(analyticsAttributions)
          .set(values)
          .where(
            and(
              eq(analyticsAttributions.attributionId, existingAttributionId),
              gt(analyticsAttributions.expiresAt, new Date()),
            ),
          )
          .returning({ attributionId: analyticsAttributions.attributionId })
      : [];
    const [inserted] = existing
      ? []
      : await db
          .insert(analyticsAttributions)
          .values(values)
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
