/** @jest-environment node */
import { NextRequest } from 'next/server';

const mockGetCurrentAuthor = jest.fn();
const mockGetOrder = jest.fn();
const mockBuildInput = jest.fn();

jest.mock('@/db/services', () => ({
  paymentService: {
    getOrderForAuthorByStripeSessionId: (...args: unknown[]) => mockGetOrder(...args),
  },
  fiscalDocumentService: {
    getByOrderId: jest.fn(async () => null),
    fiscalPdfUrl: jest.fn(),
  },
}));
jest.mock('@/db/services/payment', () => ({
  buildCreditOrderConversionInput: (...args: unknown[]) => mockBuildInput(...args),
  buildPaymentOrderPurchasePayload: () => ({ transaction_id: 'order-1' }),
}));
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => mockGetCurrentAuthor() }));

import { GET } from './route';

const serverInput = {
  orderId: 'order-1',
  amountCents: 849,
  currency: 'EUR',
  packageKey: 'credit_package_ten',
  packageName: '10 Mythoria Credits',
  credits: 10,
};
const order = (status: string) => ({
  orderId: 'order-1',
  status,
  amount: 900,
  currency: 'eur',
  provider: 'stripe',
  creditBundle: { credits: 10, price: 9 },
  metadata: null,
});
const request = () =>
  new NextRequest('https://mythoria.pt/api/payments/stripe/session?sessionId=cs_1');

describe('GET /api/payments/stripe/session (OpenAI Ads)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentAuthor.mockResolvedValue({ authorId: 'author-1' });
    mockBuildInput.mockReturnValue(serverInput);
  });

  it('returns the server-built order_created input for a completed order', async () => {
    mockGetOrder.mockResolvedValue(order('completed'));
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect((await response.json()).adConversion).toEqual(serverInput);
  });

  it('omits the input while the order is not completed', async () => {
    mockGetOrder.mockResolvedValue(order('pending'));
    const json = await (await GET(request())).json();
    expect(json).not.toHaveProperty('adConversion');
    expect(mockBuildInput).not.toHaveBeenCalled();
  });

  it('omits the input instead of failing when it cannot be built', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockGetOrder.mockResolvedValue(order('completed'));
    mockBuildInput.mockImplementation(() => {
      throw new Error('bad metadata');
    });
    const response = await GET(request());
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ success: true, status: 'completed' });
    expect(json).not.toHaveProperty('adConversion');
  });
});
