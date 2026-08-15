import { NextRequest } from 'next/server';
import { analyticsReference } from '@/lib/analytics/reference';

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

function selectRows(rows: unknown[]) {
  const result = {
    limit: jest.fn().mockResolvedValue(rows),
    then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return {
    from: jest.fn(() => ({ where: jest.fn(() => result) })),
  };
}

describe('POST /api/analytics/attribution', () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockUpdate.mockReset();
    mockInsert.mockReset();
  });

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

  it('preserves an existing first touch while updating the mutable latest campaign context', async () => {
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
        utmSource: 'google',
        utmCampaign: 'retarget',
        gbraid: 'new-click',
      }),
    );
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('accepts a share touch only when the public destination resolves to the opaque story reference', async () => {
    const storyId = '00000000-0000-4000-8000-000000000099';
    mockSelect
      .mockReturnValueOnce(selectRows([{ storyId }]))
      .mockReturnValueOnce(selectRows([]));
    mockInsert.mockReturnValue({
      values: jest.fn((values) => ({
        returning: jest.fn().mockResolvedValue([{ attributionId }]),
        values,
      })),
    });

    const response = await POST(
      request({
        analyticsContext: {
          ...analyticsContext,
          pageLocation: 'https://mythoria.pt/en-US/p/summer-story',
        },
        landingPath: '/en-US/p/summer-story',
        campaign: {
          utm_source: 'copy_link',
          utm_medium: 'referral',
          utm_campaign: 'story_share',
          utm_id: analyticsReference(storyId),
          utm_content: 'public',
        },
      }),
    );

    expect(await response.json()).toEqual({
      captured: true,
      storyShare: {
        itemId: analyticsReference(storyId),
        method: 'copy_link',
        scope: 'public',
      },
    });
    const insertValues = mockInsert.mock.results[0]?.value.values.mock.calls[0]?.[0];
    expect(insertValues).toMatchObject({
      storyShareItemId: analyticsReference(storyId),
      storyShareMethod: 'copy_link',
      storyShareScope: 'public',
    });
    expect(JSON.stringify(insertValues)).not.toContain(storyId);
  });

  it.each([
    ['/en-US/s/00000000-0000-4000-8000-000000000099', 'private_view'],
    ['/en-US/s/00000000-0000-4000-8000-000000000099/edit', 'private_edit'],
  ])('validates %s as a %s share destination', async (landingPath, scope) => {
    const storyId = '00000000-0000-4000-8000-000000000099';
    mockSelect.mockReturnValueOnce(selectRows([{ storyId }]));
    mockInsert.mockReturnValue({
      values: jest.fn((values) => ({
        returning: jest.fn().mockResolvedValue([{ attributionId }]),
        values,
      })),
    });

    const response = await POST(
      request({
        analyticsContext,
        landingPath,
        campaign: {
          utm_source: 'native_share',
          utm_medium: 'referral',
          utm_campaign: 'story_share',
          utm_id: analyticsReference(storyId),
          utm_content: scope,
        },
      }),
    );

    expect(await response.json()).toMatchObject({
      captured: true,
      storyShare: { itemId: analyticsReference(storyId), scope },
    });
  });

  it('carries a day-29 share context into a fresh GA session without extending its expiry', async () => {
    const storyShareExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const storyShareTouchedAt = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    const carryover = {
      attributionId,
      clientId: '123.456',
      storyShareItemId: 'a1b2c3d4e5f6',
      storyShareMethod: 'copy_link',
      storyShareScope: 'public',
      storyShareTouchedAt,
      storyShareExpiresAt,
    };
    mockSelect
      .mockReturnValueOnce(selectRows([]))
      .mockReturnValueOnce(selectRows([carryover]));
    mockInsert.mockReturnValue({
      values: jest.fn((values) => ({
        returning: jest.fn().mockResolvedValue([{ attributionId }]),
        values,
      })),
    });

    const response = await POST(request({ analyticsContext }, true));
    const insertValues = mockInsert.mock.results[0]?.value.values.mock.calls[0]?.[0];
    expect(await response.json()).toMatchObject({
      captured: true,
      storyShare: { itemId: 'a1b2c3d4e5f6', method: 'copy_link', scope: 'public' },
    });
    expect(insertValues).toMatchObject({
      storyShareTouchedAt,
      storyShareExpiresAt,
    });
  });

  it('does not carry an expired day-31 share context into a fresh GA session', async () => {
    const expired = {
      attributionId,
      clientId: '123.456',
      storyShareItemId: 'a1b2c3d4e5f6',
      storyShareMethod: 'copy_link',
      storyShareScope: 'public',
      storyShareTouchedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      storyShareExpiresAt: new Date(Date.now() - 1),
    };
    mockSelect
      .mockReturnValueOnce(selectRows([]))
      .mockReturnValueOnce(selectRows([expired]));
    mockInsert.mockReturnValue({
      values: jest.fn((values) => ({
        returning: jest.fn().mockResolvedValue([{ attributionId }]),
        values,
      })),
    });

    const response = await POST(request({ analyticsContext }, true));
    const insertValues = mockInsert.mock.results[0]?.value.values.mock.calls[0]?.[0];
    expect(await response.json()).toEqual({ captured: true });
    expect(insertValues).not.toHaveProperty('storyShareItemId');
  });
});
