/** @jest-environment node */
import { NextRequest } from 'next/server';

const mockDb = { marker: 'db' };
const mockGetCurrentAuthor = jest.fn();
const mockEnqueueAdConversion = jest.fn();
const mockAdContext = {
  adConsent: 'denied',
  sourceUrl: 'https://mythoria.pt',
  capturedAt: '2026-11-16T00:00:00.000Z',
};

jest.mock('@/config/environment', () => ({
  getEnvironmentConfig: () => ({ admin: { apiUrl: 'https://admin.test', apiKey: 'key' } }),
}));
jest.mock('@/db', () => ({
  get db() {
    return mockDb;
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => mockGetCurrentAuthor() }));
jest.mock('@/lib/openai-ads/outbox', () => ({
  enqueueAdConversion: (...args: unknown[]) => mockEnqueueAdConversion(...args),
}));
jest.mock('@/lib/openai-ads/context', () => ({
  resolveAdContextSafely: jest.fn(async () => mockAdContext),
}));

import { POST } from './route';

const validBody = { name: 'Ana', email: 'ana@example.com', message: 'Hello' };
const request = (body: unknown = validBody) =>
  new NextRequest('https://mythoria.pt/api/contact', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('POST /api/contact (OpenAI Ads)', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('enqueues contact_submitted for the created ticket with the signed-in author', async () => {
    mockGetCurrentAuthor.mockResolvedValue({ authorId: 'author-1' });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'ticket-1' }) });

    const response = await POST(request());

    expect(await response.json()).toMatchObject({
      success: true,
      ticketId: 'ticket-1',
      adEventId: 'contact_ticket-1',
    });
    expect(mockEnqueueAdConversion).toHaveBeenCalledWith(mockDb, {
      conversion: expect.objectContaining({
        eventType: 'custom',
        customEventName: 'contact_submitted',
        eventId: 'contact_ticket-1',
      }),
      authorId: 'author-1',
      adContext: mockAdContext,
    });
  });

  it('enqueues an anonymous conversion when the visitor is not signed in', async () => {
    mockGetCurrentAuthor.mockRejectedValue(new Error('no session'));
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 42 }) });

    await POST(request());

    expect(mockEnqueueAdConversion).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        conversion: expect.objectContaining({ eventId: 'contact_42' }),
        authorId: null,
      }),
    );
  });

  it('enqueues nothing when the ticket could not be created', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'down' });
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(mockEnqueueAdConversion).not.toHaveBeenCalled();
  });
});
