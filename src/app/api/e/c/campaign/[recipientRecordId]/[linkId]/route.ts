import { NextRequest, NextResponse } from 'next/server';
import { leadService } from '@/db/services/leads';
import { setLeadSession } from '@/lib/lead-session';
import { notificationClient } from '@/lib/notifications/client';
import {
  EMAIL_CAMPAIGN_ATTRIBUTION_COOKIE,
  EMAIL_CAMPAIGN_ATTRIBUTION_MAX_AGE,
} from '@/lib/email-campaign-attribution';
import { normalizeLocale } from '@/utils/locale-utils';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DESTINATIONS: Record<string, string> = {
  homepage: '',
  'sign-up': 'sign-up',
  termsAndConditions: 'termsAndConditions',
  'tell-your-story': 'tell-your-story',
  'buy-credits': 'buy-credits',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recipientRecordId: string; linkId: string }> },
) {
  const { recipientRecordId, linkId } = await params;
  const destination = DESTINATIONS[linkId];
  if (destination === undefined) return new NextResponse('Invalid link ID', { status: 400 });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
  let locale = normalizeLocale();
  let recipient = null;

  if (UUID_PATTERN.test(recipientRecordId)) {
    recipient = await notificationClient.recordCampaignClick(recipientRecordId, linkId);
    if (recipient) {
      locale = normalizeLocale(recipient.language);
      if (recipient.recipientType === 'lead') {
        const lead = await leadService.getLeadById(recipient.recipientId);
        if (lead && lead.email.toLowerCase() === recipient.email.toLowerCase()) {
          await setLeadSession({
            leadId: lead.id,
            email: lead.email,
            mobilePhone: lead.mobilePhone,
            name: lead.name,
            language: lead.language,
          });
        }
      }
    }
  }

  const path = destination ? `/${locale}/${destination}` : `/${locale}`;
  const response = NextResponse.redirect(new URL(path, baseUrl), { status: 302 });
  if (recipient) {
    response.cookies.set(EMAIL_CAMPAIGN_ATTRIBUTION_COOKIE, recipientRecordId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: EMAIL_CAMPAIGN_ATTRIBUTION_MAX_AGE,
    });
  }
  return response;
}
