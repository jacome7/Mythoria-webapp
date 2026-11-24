/** @jest-environment node */
import { NextRequest } from 'next/server';

const mockSet = jest.fn();
const mockGetCurrentAuthor = jest.fn();
const mockRevokeGrowth = jest.fn();
const receiptId = '00000000-0000-4000-8000-000000000001';

jest.mock('@/db', () => ({
  db: {
    transaction: (callback: (tx: unknown) => unknown) =>
      callback({
        update: () => ({
          set: (values: unknown) => {
            mockSet(values);
            return {
              where: () => ({
                returning: async () => [{ attributionId: receiptId, clientId: '123.456' }],
              }),
            };
          },
        }),
      }),
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => mockGetCurrentAuthor() }));
jest.mock('@/lib/growth/measurement-server', () => ({
  revokeGrowthMeasurement: async (...args: unknown[]) => mockRevokeGrowth(...args),
}));

import { POST } from './route';

describe('POST /api/analytics/attribution/revoke', () => {
  beforeEach(() => jest.clearAllMocks());

  it('revokes the receipt, clears abandoned claims and optional links, and scrubs queued fields', async () => {
    mockGetCurrentAuthor.mockResolvedValue({ authorId: 'author-1' });
    const response = await POST(
      new NextRequest('https://mythoria.pt/api/analytics/attribution/revoke', {
        method: 'POST',
        headers: { cookie: `mythoria_attribution=${receiptId}` },
      }),
    );

    expect(await response.json()).toEqual({ revoked: true });
    expect(mockSet).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        revokedAt: expect.any(Date),
        oppref: null,
        obref: null,
        gclid: null,
        storyShareItemId: null,
      }),
    );
    expect(mockSet).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        suppressionReason: 'consent_revoked',
        claimToken: null,
        clientId: null,
        userId: null,
        params: {},
      }),
    );
    expect(mockRevokeGrowth).toHaveBeenCalledWith(receiptId);
    expect(response.cookies.get('mythoria_attribution')?.maxAge).toBe(0);
    expect(response.cookies.get('mythoria_reader_link')?.maxAge).toBe(0);
  });

  it('does not touch the database without a valid receipt cookie or author', async () => {
    mockGetCurrentAuthor.mockResolvedValue(null);
    const response = await POST(
      new NextRequest('https://mythoria.pt/api/analytics/attribution/revoke', { method: 'POST' }),
    );
    expect(response.status).toBe(200);
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockRevokeGrowth).not.toHaveBeenCalled();
  });
});
