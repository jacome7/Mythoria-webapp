/** @jest-environment node */

const mockVerify = jest.fn();
const mockReconcile = jest.fn();
jest.mock('@/lib/lulu/client', () => ({
  verifyLuluWebhook: (...input: unknown[]) => mockVerify(...input),
}));
jest.mock('@/lib/print/fulfillment', () => ({
  reconcileLuluWebhook: (...input: unknown[]) => mockReconcile(...input),
}));

import { POST } from './route';

const orderId = '32c3cb83-00c2-4933-972b-916ec8065f18';
const body = (externalId: string) =>
  JSON.stringify({
    topic: 'PRINT_JOB_STATUS_CHANGED',
    data: { id: 123, external_id: externalId },
  });
const request = (raw: string, signature = 'signature') =>
  new Request('https://example.test/api/print/lulu/webhook', {
    method: 'POST',
    body: raw,
    headers: { 'lulu-hmac-sha256': signature },
  });

describe('Lulu status webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerify.mockResolvedValue(true);
  });

  it.each([orderId, '32C3CB83'])(
    'verifies raw bytes before reconciling reference %s',
    async (externalId) => {
      const raw = body(externalId);
      expect((await POST(request(raw))).status).toBe(204);
      expect(mockVerify).toHaveBeenCalledWith(Buffer.from(raw), 'signature');
      expect(mockReconcile).toHaveBeenCalledWith('123', externalId);
    },
  );

  it('ignores the supplier test reference', async () => {
    expect((await POST(request(body('test-print-job')))).status).toBe(204);
    expect(mockReconcile).not.toHaveBeenCalled();
  });

  it('rejects invalid signatures without processing their content', async () => {
    mockVerify.mockResolvedValue(false);
    expect((await POST(request(body(orderId)))).status).toBe(401);
    expect(mockReconcile).not.toHaveBeenCalled();
  });
});
