import { NextRequest, NextResponse } from 'next/server';
import { leadService } from '@/db/services/leads';
import { setLeadSession } from '@/lib/lead-session';
import { notificationClient } from '@/lib/notifications/client';
import {
  EMAIL_CAMPAIGN_ATTRIBUTION_COOKIE,
  EMAIL_CAMPAIGN_ATTRIBUTION_MAX_AGE,
} from '@/lib/email-campaign-attribution';
import { normalizeLocale } from '@/utils/locale-utils';
import { getInvitationLocale } from '@/db/services/survey-studies';
import { verifySurveyToken } from '@/lib/surveys/tokens';
import { surveyLogger } from '@/lib/surveys/logger';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DESTINATIONS: Record<string, string> = {
  homepage: '',
  'sign-up': 'sign-up',
  termsAndConditions: 'termsAndConditions',
  'tell-your-story': 'tell-your-story',
  'buy-credits': 'buy-credits',
};
/** Survey invitation emails: destination depends on the signed token in `?t=`. */
const SURVEY_LINK_ID = 'survey';

/**
 * Resolves the respondent-facing survey path for a signed token, or null when the token is
 * invalid or unknown (the caller then falls back to the home page, never an error page).
 */
async function resolveSurveyPath(token: string | null): Promise<string | null> {
  if (!token) return null;
  try {
    const invitationId = verifySurveyToken(token);
    if (!invitationId) return null;
    const invitationLocale = await getInvitationLocale(invitationId);
    if (!invitationLocale) return null;
    return `/${normalizeLocale(invitationLocale)}/survey/${token}`;
  } catch (error) {
    surveyLogger.warn('survey_link_resolution_failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recipientRecordId: string; linkId: string }> },
) {
  const { recipientRecordId, linkId } = await params;
  const isSurveyLink = linkId === SURVEY_LINK_ID;
  const destination = isSurveyLink ? '' : DESTINATIONS[linkId];
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

  const surveyPath = isSurveyLink
    ? await resolveSurveyPath(request.nextUrl.searchParams.get('t'))
    : null;
  const path = surveyPath ?? (destination ? `/${locale}/${destination}` : `/${locale}`);
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
