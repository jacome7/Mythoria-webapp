import type { NextRequest } from 'next/server';

export const EMAIL_CAMPAIGN_ATTRIBUTION_COOKIE = 'mythoria_email_campaign_attribution';
export const EMAIL_CAMPAIGN_ATTRIBUTION_MAX_AGE = 30 * 24 * 60 * 60;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readEmailCampaignAttribution(request: NextRequest): string | undefined {
  const value = request.cookies.get(EMAIL_CAMPAIGN_ATTRIBUTION_COOKIE)?.value;
  return value && UUID_PATTERN.test(value) ? value : undefined;
}
