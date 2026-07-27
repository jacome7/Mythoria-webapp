jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const getCurrentAuthorMock = jest.fn();
const startStoryGenerationMock = jest.fn();
const whereMock = jest.fn();
const fromMock = jest.fn(() => ({ where: whereMock }));
const selectMock = jest.fn(() => ({ from: fromMock }));

jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => getCurrentAuthorMock() }));
jest.mock('@/lib/story-generation', () => ({
  startStoryGeneration: (...args: unknown[]) => startStoryGenerationMock(...args),
}));
jest.mock('@/db', () => ({ db: { select: () => selectMock() } }));

import type { NextRequest } from 'next/server';
import { POST } from './route';

const validBody = {
  storyId: '11111111-1111-4111-8111-111111111111',
  idempotencyKey: '22222222-2222-4222-8222-222222222222',
  features: { ebook: true, printed: false, audiobook: false },
};

const requestFor = (body: unknown, attributionId?: string) =>
  ({
    json: async () => body,
    cookies: {
      get: (name: string) =>
        name === 'mythoria_attribution' && attributionId ? { value: attributionId } : undefined,
    },
  }) as unknown as NextRequest;

describe('POST /api/stories/complete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentAuthorMock.mockResolvedValue({
      authorId: 'author-1',
      clerkUserId: 'user-1',
    });
    whereMock.mockResolvedValue([]);
  });

  it('returns 400 for a request without an idempotency key', async () => {
    const response = await POST(
      requestFor({ storyId: validBody.storyId, features: validBody.features }),
    );
    expect(response.status).toBe(400);
    expect(startStoryGenerationMock).not.toHaveBeenCalled();
  });

  it('returns the durable queue result with 202', async () => {
    startStoryGenerationMock.mockResolvedValue({
      storyId: validBody.storyId,
      runId: '33333333-3333-4333-8333-333333333333',
      status: 'queued',
      remainingCredits: 7,
      duplicate: false,
    });
    const response = await POST(requestFor(validBody));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      status: 'queued',
      remainingCredits: 7,
    });
    expect(startStoryGenerationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: 'author-1',
        clerkUserId: 'user-1',
        idempotencyKey: validBody.idempotencyKey,
      }),
    );
  });

  it('maps insufficient credits to a conflict without publishing', async () => {
    startStoryGenerationMock.mockRejectedValue(new Error('Insufficient credits'));
    const response = await POST(requestFor(validBody));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: 'Insufficient credits' });
  });

  it('binds a current-author attribution and its validated intent to story generation', async () => {
    whereMock.mockResolvedValue([
      { attributionId: 'attribution-1', primaryIntent: 'grandparents' },
    ]);
    startStoryGenerationMock.mockResolvedValue({
      storyId: validBody.storyId,
      runId: '33333333-3333-4333-8333-333333333333',
      status: 'queued',
      remainingCredits: 7,
      duplicate: false,
    });

    const response = await POST(requestFor(validBody, 'attribution-1'));
    expect(response.status).toBe(202);
    expect(startStoryGenerationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: 'author-1',
        attributionId: 'attribution-1',
        primaryIntent: 'grandparents',
      }),
    );
  });

  it('never forwards an invalid stored intent', async () => {
    whereMock.mockResolvedValue([{ attributionId: 'attribution-1', primaryIntent: 'unknown' }]);
    startStoryGenerationMock.mockResolvedValue({
      storyId: validBody.storyId,
      status: 'queued',
    });

    await POST(requestFor(validBody, 'attribution-1'));
    expect(startStoryGenerationMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ primaryIntent: 'unknown' }),
    );
  });
});
