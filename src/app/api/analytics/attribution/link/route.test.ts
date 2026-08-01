const getCurrentAuthorMock = jest.fn();
const selectWhereMock = jest.fn();
const updateWhereMock = jest.fn();
const updateSetMock = jest.fn();
const insertValuesMock = jest.fn();
const transactionMock = jest.fn();

jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => getCurrentAuthorMock() }));
jest.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => selectWhereMock(...args),
      }),
    }),
    transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

import { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/analytics/attribution/link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentAuthorMock.mockResolvedValue({
      authorId: 'author-1',
      clerkUserId: 'clerk-1',
    });
    selectWhereMock.mockResolvedValue([
      {
        attributionId: '11111111-1111-4111-8111-111111111111',
        clientId: '123.456',
        sessionId: 1712345678,
        consent: {
          analyticsStorage: 'granted',
          adUserData: 'denied',
          adPersonalization: 'denied',
        },
        landingSlug: 'homepage',
        primaryIntent: 'romance',
      },
    ]);
    transactionMock.mockImplementation(async (callback) =>
      callback({
        insert: () => ({
          values: (...args: unknown[]) => {
            insertValuesMock(...args);
            return {
              onConflictDoUpdate: () => ({
                returning: jest.fn().mockResolvedValue([{ outboxId: 'outbox-1' }]),
              }),
            };
          },
        }),
        update: () => ({
          set: (...args: unknown[]) => {
            updateSetMock(...args);
            return {
              where: (...args: unknown[]) => {
                updateWhereMock(...args);
                return {
                  returning: jest.fn().mockResolvedValue([]),
                };
              },
            };
          },
        }),
      }),
    );
    updateWhereMock.mockResolvedValue(undefined);
  });

  it('links the current author without deleting the 24-hour attribution cookie', async () => {
    const request = new NextRequest('https://mythoria.pt/api/analytics/attribution/link', {
      method: 'POST',
      headers: {
        cookie: 'mythoria_attribution=11111111-1111-4111-8111-111111111111',
      },
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ linked: true });
    expect(updateWhereMock).toHaveBeenCalledTimes(3);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: 'author-1',
        clientId: '123.456',
        params: expect.objectContaining({
          landing_slug: 'homepage',
          primary_intent: 'romance',
        }),
      }),
    );
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
