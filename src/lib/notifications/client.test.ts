/** @jest-environment node */
import { notificationClient } from './client';

describe('notification client event identity', () => {
  it('reads the webhook service outcome instead of the transport success flag', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        correlationId: 'request-1',
        result: {
          success: false,
          data: { deliveryStatus: 'failed' },
          error: { message: 'Provider rejected the email' },
        },
      }),
    });
    expect(
      await notificationClient.sendEmail({
        recipients: ['reader@example.com'],
        template: 'ticket-created',
        variables: {},
      }),
    ).toMatchObject({
      success: false,
      deliveryStatus: 'failed',
      error: 'Provider rejected the email',
    });
  });

  it('preserves pending delivery from the actual webhook response envelope', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        correlationId: 'request-1',
        result: { success: true, data: { id: 'delivery-1', deliveryStatus: 'pending' } },
      }),
    });
    expect(
      await notificationClient.sendEmail({
        recipients: ['reader@example.com'],
        template: 'ticket-created',
        variables: {},
      }),
    ).toMatchObject({ success: true, messageId: 'delivery-1', deliveryStatus: 'pending' });
  });
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { deliveryStatus: 'pending' } }),
    });
    global.fetch = fetchMock;
  });
  it('keeps separate credit events distinct and retries stable', async () => {
    const base = { email: 'reader@example.com', name: 'Reader', credits: 5, authorId: 'author-1' };
    await notificationClient.sendCreditsAddedNotification({ ...base, entityId: 'payment-1' });
    await notificationClient.sendCreditsAddedNotification({ ...base, entityId: 'payment-1' });
    await notificationClient.sendCreditsAddedNotification({ ...base, entityId: 'payment-2' });
    const headers = fetchMock.mock.calls.map((call) => call[1].headers);
    expect(headers.map((h) => h['Idempotency-Key'])).toEqual([
      'credits-added:payment-1',
      'credits-added:payment-1',
      'credits-added:payment-2',
    ]);
  });
  it('uses one correlation ID and a stable event key, with distinct fallback calls', async () => {
    const payload = {
      recipients: ['reader@example.com'],
      template: 'ticket-created',
      variables: {},
      entityId: 'ticket-1',
    };
    await notificationClient.sendEmail(payload);
    await notificationClient.sendEmail(payload);
    await notificationClient.sendEmail({ ...payload, entityId: undefined });
    await notificationClient.sendEmail({ ...payload, entityId: undefined });
    const bodies = fetchMock.mock.calls.map((call) => JSON.parse(call[1].body));
    expect(bodies[0].correlationId).toBe('ticket-created:ticket-1');
    expect(bodies[0].data.correlationId).toBe(bodies[0].correlationId);
    expect(bodies[1].correlationId).toBe(bodies[0].correlationId);
    expect(bodies[2].correlationId).not.toBe(bodies[3].correlationId);
  });
});
