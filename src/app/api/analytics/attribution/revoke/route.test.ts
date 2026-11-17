/** @jest-environment node */
import { NextRequest } from 'next/server';

const mockSet = jest.fn();
const mockGetCurrentAuthor = jest.fn();

jest.mock('@/db', () => ({
  db: {
    update: () => ({
      set: (values: unknown) => {
        mockSet(values);
        return { where: jest.fn().mockResolvedValue(undefined) };
      },
    }),
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => mockGetCurrentAuthor() }));

import { POST } from './route';

describe('POST /api/analytics/attribution/revoke', () => {
  beforeEach(() => {
    mockSet.mockReset();
    mockGetCurrentAuthor.mockReset();
  });

  it('expires the attribution and clears the OpenAI Ads references', async () => {
    mockGetCurrentAuthor.mockResolvedValue({ authorId: 'author-1' });
    const response = await POST(
      new NextRequest('https://mythoria.pt/api/analytics/attribution/revoke', {
        method: 'POST',
        headers: { cookie: 'mythoria_attribution=00000000-0000-4000-8000-000000000001' },
      }),
    );

    expect(await response.json()).toEqual({ revoked: true });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresAt: expect.any(Date),
        oppref: null,
        opprefCapturedAt: null,
        obref: null,
      }),
    );
  });

  it('does not touch the database without an attribution cookie or author', async () => {
    mockGetCurrentAuthor.mockResolvedValue(null);
    const response = await POST(
      new NextRequest('https://mythoria.pt/api/analytics/attribution/revoke', { method: 'POST' }),
    );
    expect(response.status).toBe(200);
    expect(mockSet).not.toHaveBeenCalled();
  });
});
