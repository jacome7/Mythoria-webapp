/** @jest-environment node */
import { NextRequest } from 'next/server';
import { PrintError } from '@/lib/print/contracts';

const mockStartPrintCheckout = jest.fn();
const mockGetCurrentAuthor = jest.fn();
const mockEnqueueAdConversion = jest.fn();
const storyId = '32c3cb83-00c2-4933-972b-916ec8065f18';
const shippingId = '8d9f18f9-6a1f-4acd-ac13-a4da2b998cee';
const intentId = 'bac88002-1d44-4451-9285-d4bd2485a4ec';

jest.mock('@/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => mockGetCurrentAuthor() }));
jest.mock('@/lib/print/checkout', () => ({
  ...jest.requireActual('@/lib/print/checkout'),
  startPrintCheckout: (...args: unknown[]) => mockStartPrintCheckout(...args),
}));
jest.mock('@/lib/analytics/server-context', () => ({
  resolveServerAnalyticsContext: jest.fn(async () => ({})),
}));
jest.mock('@/lib/product-generation', () => ({ printOrderRequestedOutboxEntry: () => undefined }));
jest.mock('@/lib/openai-ads/outbox', () => ({
  enqueueAdConversion: (...args: unknown[]) => mockEnqueueAdConversion(...args),
}));
jest.mock('@/lib/openai-ads/context', () => ({
  resolveAdContextSafely: jest.fn(async () => ({ adConsent: 'denied' })),
}));

import { POST } from './route';

const validBody = {
  storyId,
  shippingId,
  intentId,
  totalCost: 30,
  numberOfCopies: 3,
  printingOption: { serviceCode: 'printedSoftCover' },
};
const request = (input: unknown, legacy = false) =>
  new NextRequest('https://mythoria.pt/api/print-requests', {
    method: 'POST',
    body: JSON.stringify(legacy ? input : { checkout: input }),
  });

describe('POST /api/print-requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentAuthor.mockResolvedValue({ authorId: 'author-1', clerkUserId: 'clerk-1' });
  });

  it('uses the same conversion ID on idempotent checkout replay', async () => {
    const requestedAt = new Date('2026-11-16T10:00:00.000Z');
    const order = {
      request: { id: 'print-1', storyId, status: 'requested', requestedAt },
      fulfillment: { creditsSpent: 30, copies: 3 },
    };
    mockStartPrintCheckout
      .mockResolvedValueOnce({ ...order, duplicate: false })
      .mockResolvedValueOnce({ ...order, duplicate: true });

    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await POST(request(validBody));
      expect(await response.json()).toMatchObject({ success: true, adEventId: 'print_print-1' });
    }
    expect(mockStartPrintCheckout).toHaveBeenCalledTimes(2);
    expect(mockStartPrintCheckout.mock.calls[0][0]).toEqual(validBody);
    expect(mockStartPrintCheckout.mock.calls[1][0]).toEqual(validBody);
    expect(mockEnqueueAdConversion).toHaveBeenCalledWith(expect.anything(), {
      conversion: expect.objectContaining({
        customEventName: 'print_order_requested',
        eventId: 'print_print-1',
        data: expect.objectContaining({
          contents: [expect.objectContaining({ id: 'print_order', quantity: 3 })],
        }),
      }),
      authorId: 'author-1',
      adContext: { adConsent: 'denied' },
      occurredAt: requestedAt,
    });
  });

  it.each([
    { totalCost: -30 },
    { numberOfCopies: 11 },
    { shippingId: undefined },
    { intentId: undefined },
  ])('rejects invalid checkout before accessing the order service (%j)', async (change) => {
    const response = await POST(request({ ...validBody, ...change }));
    expect(response.status).toBe(400);
    expect(mockStartPrintCheckout).not.toHaveBeenCalled();
    expect(mockEnqueueAdConversion).not.toHaveBeenCalled();
  });

  it('does not emit a conversion when the order was not paid', async () => {
    mockStartPrintCheckout.mockRejectedValue(
      new PrintError('insufficient_credits', 'Insufficient credits.', 402),
    );
    expect((await POST(request(validBody))).status).toBe(402);
    expect(mockEnqueueAdConversion).not.toHaveBeenCalled();
  });

  it('tells a stale checkout tab to reload before accessing the order service', async () => {
    const response = await POST(request({ ...validBody, intentId: undefined }, true));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: expect.stringMatching(/reload/i) });
    expect(mockStartPrintCheckout).not.toHaveBeenCalled();
    expect(mockEnqueueAdConversion).not.toHaveBeenCalled();
  });
});
