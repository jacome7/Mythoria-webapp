jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const getCurrentAuthorMock = jest.fn();
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => getCurrentAuthorMock() }));

import { POST } from './route';

describe('retired story credit endpoint', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires authentication', async () => {
    getCurrentAuthorMock.mockResolvedValue(null);
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it('never deducts and directs cached clients to the atomic endpoint', async () => {
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });
    const response = await POST();
    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: 'This endpoint has been retired. Refresh the page to start generation safely.',
      code: 'ATOMIC_GENERATION_REQUIRED',
    });
  });
});
