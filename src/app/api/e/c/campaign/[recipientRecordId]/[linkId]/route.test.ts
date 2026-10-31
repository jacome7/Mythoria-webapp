const recordCampaignClickMock = jest.fn();
const getLeadByIdMock = jest.fn();
const setLeadSessionMock = jest.fn();
const getInvitationLocaleMock = jest.fn();

jest.mock('@/lib/notifications/client', () => ({
  notificationClient: {
    recordCampaignClick: (...a: unknown[]) => recordCampaignClickMock(...a),
  },
}));
jest.mock('@/db/services/leads', () => ({
  leadService: { getLeadById: (...a: unknown[]) => getLeadByIdMock(...a) },
}));
jest.mock('@/lib/lead-session', () => ({
  setLeadSession: (...a: unknown[]) => setLeadSessionMock(...a),
}));
jest.mock('@/db/services/survey-studies', () => ({
  getInvitationLocale: (...a: unknown[]) => getInvitationLocaleMock(...a),
}));
jest.mock('@/lib/surveys/logger', () => ({ surveyLogger: { warn: jest.fn(), error: jest.fn() } }));

import { NextRequest } from 'next/server';
import { GET } from './route';
import { createSurveyToken } from '@/lib/surveys/tokens';
import { EMAIL_CAMPAIGN_ATTRIBUTION_COOKIE } from '@/lib/email-campaign-attribution';

const SECRET = 'test-secret-test-secret-test-secret-00';
const RECIPIENT_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const INVITATION_ID = '00000000-0000-4000-8000-000000000001';
const BASE_URL = 'https://mythoria.test';

function call(linkId: string, query = '', recipientRecordId = RECIPIENT_ID) {
  const request = new NextRequest(
    `${BASE_URL}/api/e/c/campaign/${recipientRecordId}/${linkId}${query}`,
  );
  return GET(request, { params: Promise.resolve({ recipientRecordId, linkId }) });
}

describe('GET /api/e/c/campaign/[recipientRecordId]/[linkId]', () => {
  const env = { ...process.env };
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SURVEY_LINK_SECRET = SECRET;
    process.env.NEXT_PUBLIC_BASE_URL = BASE_URL;
    recordCampaignClickMock.mockResolvedValue({
      recipientType: 'user',
      recipientId: 'author-1',
      email: 'ana@example.com',
      language: 'pt-PT',
    });
  });
  afterAll(() => {
    process.env = env;
  });

  it('keeps existing destinations working', async () => {
    const res = await call('buy-credits');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${BASE_URL}/pt-PT/buy-credits`);
    expect(recordCampaignClickMock).toHaveBeenCalledWith(RECIPIENT_ID, 'buy-credits');
  });

  it('rejects unknown link ids', async () => {
    const res = await call('nope');
    expect(res.status).toBe(400);
    expect(recordCampaignClickMock).not.toHaveBeenCalled();
  });

  describe('survey link', () => {
    it('redirects a valid token to the invitation locale and records the click + cookie', async () => {
      const token = createSurveyToken(INVITATION_ID, SECRET);
      getInvitationLocaleMock.mockResolvedValue('de-DE');
      const res = await call('survey', `?t=${token}`);
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe(`${BASE_URL}/de-DE/survey/${token}`);
      expect(getInvitationLocaleMock).toHaveBeenCalledWith(INVITATION_ID);
      expect(recordCampaignClickMock).toHaveBeenCalledWith(RECIPIENT_ID, 'survey');
      expect(res.cookies.get(EMAIL_CAMPAIGN_ATTRIBUTION_COOKIE)?.value).toBe(RECIPIENT_ID);
    });

    it('normalizes short stored locales', async () => {
      const token = createSurveyToken(INVITATION_ID, SECRET);
      getInvitationLocaleMock.mockResolvedValue('en');
      const res = await call('survey', `?t=${token}`);
      expect(res.headers.get('location')).toBe(`${BASE_URL}/en-US/survey/${token}`);
    });

    it('falls back to the home page for a tampered token without a 500', async () => {
      const token = createSurveyToken(INVITATION_ID, SECRET);
      const tampered = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;
      const res = await call('survey', `?t=${tampered}`);
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe(`${BASE_URL}/pt-PT`);
      expect(getInvitationLocaleMock).not.toHaveBeenCalled();
      expect(recordCampaignClickMock).toHaveBeenCalledWith(RECIPIENT_ID, 'survey');
      expect(res.cookies.get(EMAIL_CAMPAIGN_ATTRIBUTION_COOKIE)?.value).toBe(RECIPIENT_ID);
    });

    it('falls back to the home page when the token is missing', async () => {
      const res = await call('survey');
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe(`${BASE_URL}/pt-PT`);
    });

    it('falls back to the home page when the invitation does not exist', async () => {
      const token = createSurveyToken(INVITATION_ID, SECRET);
      getInvitationLocaleMock.mockResolvedValue(null);
      const res = await call('survey', `?t=${token}`);
      expect(res.headers.get('location')).toBe(`${BASE_URL}/pt-PT`);
    });

    it('falls back to the home page when the lookup or secret fails', async () => {
      const token = createSurveyToken(INVITATION_ID, SECRET);
      getInvitationLocaleMock.mockRejectedValue(new Error('db down'));
      const failedLookup = await call('survey', `?t=${token}`);
      expect(failedLookup.status).toBe(302);
      expect(failedLookup.headers.get('location')).toBe(`${BASE_URL}/pt-PT`);

      delete process.env.SURVEY_LINK_SECRET;
      const noSecret = await call('survey', `?t=${token}`);
      expect(noSecret.status).toBe(302);
      expect(noSecret.headers.get('location')).toBe(`${BASE_URL}/pt-PT`);
    });

    it('still resolves the survey path when the recipient id is not a uuid (no click recorded)', async () => {
      const token = createSurveyToken(INVITATION_ID, SECRET);
      getInvitationLocaleMock.mockResolvedValue('fr-FR');
      const res = await call('survey', `?t=${token}`, 'not-a-uuid');
      expect(recordCampaignClickMock).not.toHaveBeenCalled();
      expect(res.headers.get('location')).toBe(`${BASE_URL}/fr-FR/survey/${token}`);
      expect(res.cookies.get(EMAIL_CAMPAIGN_ATTRIBUTION_COOKIE)).toBeUndefined();
    });
  });
});
