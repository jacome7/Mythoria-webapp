/** @jest-environment node */
import { NextRequest } from 'next/server';

const mockResults: unknown[] = [];
const mockGetCurrentAuthor = jest.fn();
const mockEnqueueAdConversion = jest.fn();
const mockTriggerPrintGeneration = jest.fn();
const mockAdContext = {
  adConsent: 'denied',
  sourceUrl: 'https://mythoria.pt',
  capturedAt: '2026-11-16T00:00:00.000Z',
};

/** Chainable Drizzle stand-in: builder calls return itself; awaiting yields the next result. */
function mockChain(): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          const result = mockResults.shift();
          return (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject);
        }
        return () => proxy;
      },
    },
  );
  return proxy;
}

const mockDb = {
  select: () => mockChain(),
  insert: () => mockChain(),
  delete: () => mockChain(),
};

jest.mock('@/db', () => ({
  get db() {
    return mockDb;
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => mockGetCurrentAuthor() }));
jest.mock('@/db/services', () => ({
  creditService: {
    getAuthorCreditBalance: jest.fn(async () => 100),
    deductCredits: jest.fn(async () => undefined),
  },
}));
jest.mock('@/config/environment', () => ({
  getEnvironmentConfig: () => ({
    admin: { apiUrl: 'https://admin.test', apiKey: 'key' },
    notification: {},
  }),
}));
jest.mock('@/lib/print-pubsub', () => ({
  PrintPubSubService: jest.fn(() => ({ triggerPrintGeneration: mockTriggerPrintGeneration })),
}));
jest.mock('@/lib/analytics/server-context', () => ({
  resolveServerAnalyticsContext: jest.fn(async () => ({})),
}));
jest.mock('@/lib/product-generation', () => ({
  printOrderRequestedOutboxEntry: () => undefined,
}));
jest.mock('@/lib/openai-ads/outbox', () => ({
  enqueueAdConversion: (...args: unknown[]) => mockEnqueueAdConversion(...args),
}));
jest.mock('@/lib/openai-ads/context', () => ({
  resolveAdContextSafely: jest.fn(async () => mockAdContext),
}));

import { POST } from './route';

describe('POST /api/print-requests (OpenAI Ads)', () => {
  const fetchMock = jest.fn();
  const requestedAt = new Date('2026-11-16T10:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    mockResults.length = 0;
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockGetCurrentAuthor.mockResolvedValue({
      authorId: 'author-1',
      clerkUserId: 'clerk-1',
      email: 'a@example.com',
      displayName: 'A',
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('enqueues print_order_requested with the copies and returns its event id', async () => {
    mockResults.push(
      [{ storyId: 'story-1', title: 'Story' }],
      [{ id: 'provider-1', availableCountries: ['PT'], isActive: true }],
      [{ id: 'print-1', requestedAt }],
      [{ id: 'print-1', status: 'requested' }],
    );
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'ticket-1' }) });

    const response = await POST(
      new NextRequest('https://mythoria.pt/api/print-requests', {
        method: 'POST',
        body: JSON.stringify({ storyId: 'story-1', totalCost: 30, numberOfCopies: 3 }),
      }),
    );

    expect(await response.json()).toMatchObject({ success: true, adEventId: 'print_print-1' });
    expect(mockEnqueueAdConversion).toHaveBeenCalledWith(mockDb, {
      conversion: expect.objectContaining({
        customEventName: 'print_order_requested',
        eventId: 'print_print-1',
        data: expect.objectContaining({
          contents: [expect.objectContaining({ id: 'print_order', quantity: 3 })],
        }),
      }),
      authorId: 'author-1',
      adContext: mockAdContext,
      occurredAt: requestedAt,
    });
  });

  it('enqueues nothing when the ticket fails and the request is rolled back', async () => {
    mockResults.push(
      [{ storyId: 'story-1' }],
      [{ id: 'provider-1', availableCountries: ['PT'], isActive: true }],
      [{ id: 'print-1', requestedAt }],
      [{ id: 'print-1' }],
      undefined,
    );
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    const response = await POST(
      new NextRequest('https://mythoria.pt/api/print-requests', {
        method: 'POST',
        body: JSON.stringify({ storyId: 'story-1', totalCost: 30 }),
      }),
    );

    expect(response.status).toBe(500);
    expect(mockEnqueueAdConversion).not.toHaveBeenCalled();
  });
});
