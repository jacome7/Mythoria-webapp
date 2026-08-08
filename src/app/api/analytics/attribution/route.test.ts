import { NextRequest } from 'next/server';

const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockInsert = jest.fn();

jest.mock('@/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  },
}));

import { POST } from './route';

const attributionId = '00000000-0000-4000-8000-000000000001';
const analyticsContext = {
  clientId: '123.456',
  sessionId: 1712345678,
  pageLocation: 'https://mythoria.pt/en-US/pricing?gclid=secret',
  pageReferrer: 'https://mythoria.pt/en-US',
  consent: {
    analyticsStorage: 'granted',
    adUserData: 'denied',
    adPersonalization: 'denied',
  },
};

function request(body: Record<string, unknown>, withCookie = false): NextRequest {
  return new NextRequest('https://mythoria.pt/api/analytics/attribution', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(withCookie ? { cookie: `mythoria_attribution=${attributionId}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/analytics/attribution', () => {
  beforeEach(() => jest.clearAllMocks());

  it('captures immutable first-touch and mutable latest-touch fields on first visit', async () => {
    mockInsert.mockReturnValue({
      values: jest.fn((values) => ({
        returning: jest.fn().mockResolvedValue([{ attributionId }]),
        values,
      })),
    });

    const response = await POST(
      request({
        analyticsContext,
        primaryIntent: 'romance',
        campaign: { utm_source: 'google', utm_campaign: 'summer', gclid: 'click-1' },
      }),
    );

    expect(response.status).toBe(200);
    const insertValues = mockInsert.mock.results[0]?.value.values.mock.calls[0]?.[0];
    expect(insertValues).toMatchObject({
      firstLandingPath: '/en-US/pricing',
      firstPrimaryIntent: 'romance',
      firstUtmSource: 'google',
      firstUtmCampaign: 'summer',
      firstClickIdentifier: 'click-1',
      firstClickIdentifierKind: 'gclid',
      latestPath: '/en-US/pricing',
      latestReferrerPath: '/en-US',
    });
  });

  it('preserves an existing first touch while updating only latest visit context', async () => {
    const existing = {
      attributionId,
      clientId: '123.456',
      firstLandingPath: '/en-US/original',
      firstPrimaryIntent: 'family',
      firstUtmSource: 'newsletter',
      firstUtmCampaign: 'launch',
      firstClickIdentifier: 'original-click',
      firstClickIdentifierKind: 'gclid',
      landingSlug: '/en-US/original',
      primaryIntent: 'family',
    };
    mockSelect.mockReturnValue({
      from: jest.fn(() => ({ where: jest.fn().mockResolvedValue([existing]) })),
    });
    const set = jest.fn((_values: Record<string, unknown>) => ({
      where: jest.fn(() => ({
        returning: jest.fn().mockResolvedValue([{ attributionId }]),
      })),
    }));
    mockUpdate.mockReturnValue({ set });

    const response = await POST(
      request(
        {
          analyticsContext: {
            ...analyticsContext,
            pageLocation: 'https://mythoria.pt/en-US/create?utm_source=google',
          },
          primaryIntent: 'romance',
          campaign: { utm_source: 'google', utm_campaign: 'retarget', gbraid: 'new-click' },
        },
        true,
      ),
    );

    expect(response.status).toBe(200);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        firstLandingPath: '/en-US/original',
        firstPrimaryIntent: 'family',
        firstUtmSource: 'newsletter',
        firstUtmCampaign: 'launch',
        firstClickIdentifier: 'original-click',
        firstClickIdentifierKind: 'gclid',
        latestPath: '/en-US/create',
      }),
    );
    expect(set.mock.calls[0]?.[0]).not.toHaveProperty('utmSource');
    expect(set.mock.calls[0]?.[0]).not.toHaveProperty('gclid');
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
