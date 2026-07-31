/** @jest-environment node */

const selectMock = jest.fn();

jest.mock('@/db', () => ({
  db: { select: (...args: unknown[]) => selectMock(...args) },
}));

import { resolveServerAnalyticsContext } from './server-context';

const grantedCookie = encodeURIComponent(
  JSON.stringify({ state: { analytics_storage: 'granted' }, timestamp: Date.now() }),
);

function mockAttributions(rows: unknown[]) {
  const limit = jest.fn().mockResolvedValue(rows);
  selectMock.mockReturnValue({
    from: jest.fn(() => ({
      where: jest.fn(() => ({
        limit,
        orderBy: jest.fn(() => ({ limit })),
      })),
    })),
  });
}

describe('resolveServerAnalyticsContext', () => {
  beforeEach(() => jest.clearAllMocks());

  it('falls back to the latest consented author attribution', async () => {
    mockAttributions([
      {
        attributionId: 'attribution-1',
        clientId: '123.456',
        sessionId: 1712345678,
        primaryIntent: 'grandparents',
        consent: {
          analyticsStorage: 'granted',
          adUserData: 'denied',
          adPersonalization: 'denied',
        },
      },
    ]);

    await expect(
      resolveServerAnalyticsContext({
        authorId: 'author-1',
        storedConsentValue: grantedCookie,
      }),
    ).resolves.toMatchObject({
      attributionId: 'attribution-1',
      context: { clientId: '123.456', sessionId: 1712345678 },
    });
  });

  it('does not reuse stored attribution after analytics consent is denied', async () => {
    mockAttributions([{ attributionId: 'attribution-1', clientId: '123.456' }]);

    await expect(
      resolveServerAnalyticsContext({
        authorId: 'author-1',
        storedConsentValue: encodeURIComponent(
          JSON.stringify({ state: { analytics_storage: 'denied' }, timestamp: Date.now() }),
        ),
      }),
    ).resolves.toEqual({});
    expect(selectMock).not.toHaveBeenCalled();
  });
});
