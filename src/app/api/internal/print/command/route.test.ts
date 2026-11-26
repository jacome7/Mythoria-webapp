/** @jest-environment node */
import { createAdminPrintOrder } from '@/lib/print/staff-proof';
import { POST } from './route';

jest.mock('@/db', () => ({ db: {} }));
jest.mock('@/lib/premium-children-book/storage', () => ({}));
jest.mock('@/lib/print/checkout', () => ({}));
jest.mock('@/lib/print/fulfillment', () => ({}));
jest.mock('@/lib/print/oidc', () => ({ verifyPrintIdentity: jest.fn() }));
jest.mock('@/lib/print/staff-proof', () => ({ createAdminPrintOrder: jest.fn() }));

const actor = { email: 'operator@example.test' };
const input = {
  storyId: '12345678-1234-4234-8234-123456789012',
  bookFormat: 'standard_a5',
  binding: 'paperback',
  copies: 1,
  orderKind: 'admin_order',
  provider: 'manual',
  shippingAddress: {
    name: 'Print Recipient',
    street1: 'Example Street 1',
    city: 'Lisbon',
    postcode: '1000-000',
    country_code: 'PT',
    phone_number: '+351210000000',
    email: 'recipient@example.test',
  },
};

function createOrder(operation: string, intentId?: string) {
  return POST(
    new Request('http://localhost/api/internal/print/command', {
      method: 'POST',
      body: JSON.stringify({ actor, operation, input: { ...input, intentId } }),
    }),
  );
}

beforeEach(() => {
  jest.mocked(createAdminPrintOrder).mockReset().mockResolvedValue({
    ticketId: '12345678-1234-4234-8234-123456789014',
    printRequestId: '12345678-1234-4234-8234-123456789015',
  });
});

it.each([undefined, 'invalid'])('requires a UUID intent for V2 creation (%s)', async (intentId) => {
  const response = await createOrder('createAdminOrderV2', intentId);
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: { code: 'invalid_print_command' } });
  expect(createAdminPrintOrder).not.toHaveBeenCalled();
});

it('passes the V2 intent to order creation', async () => {
  const intentId = '12345678-1234-4234-8234-123456789013';
  expect((await createOrder('createAdminOrderV2', intentId)).status).toBe(200);
  expect(createAdminPrintOrder).toHaveBeenCalledWith({ ...input, intentId }, actor.email);
});

it('preserves creation for the original command without an intent', async () => {
  expect((await createOrder('createAdminOrder')).status).toBe(200);
  expect(createAdminPrintOrder).toHaveBeenCalledWith(input, actor.email);
});

it('returns a conflict to the original client when it cannot show a potential match', async () => {
  jest
    .mocked(createAdminPrintOrder)
    .mockResolvedValueOnce({ status: 'possible_match', matches: [] });
  const response = await createOrder('createAdminOrder');
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ error: { code: 'print_order_match' } });
});
